import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectNext, getPendingIntervention } from '../questionSelector';
import type { KCStateRow } from '../../db';
import type { Question } from '../../questions';

function makeState(
  kc: string,
  level: 'novice' | 'partial' | 'mastery',
  score = 0.5
): KCStateRow {
  return {
    id: 1,
    student_id: 's1',
    kc_id: kc,
    conceptual_level: level,
    procedural_score: score,
    misc_status_shows_committed: 0,
    misc_restore_equals_staged: 0,
    misc_messages_only_for_self: 0,
    misc_message_omits_why: 0,
    pending_intervention: null,
  };
}

function makeQuestion(
  id: string,
  kc: string,
  level: 'novice' | 'partial' | 'mastery',
  type: Question['type'] = 'multiple_choice'
): Question {
  return {
    id,
    kc: kc as Question['kc'],
    type,
    targetLevel: level,
    scenario: null,
    question: 'Q',
    choices: type === 'multiple_choice' || type === 'scenario' ? { a: 'A' } : null,
    correct: type === 'multiple_choice' || type === 'scenario' ? 'a' : null,
    acceptedAnswers: type === 'fill_command' ? ['git add x'] : null,
    bodyRequired: false,
    misconceptionTriggers: {},
    hints: ['h1', 'h2', 'h3'],
    reveal: 'r',
    feedback: { correct: 'yes', incorrect: 'no' },
  };
}

const QUESTIONS: Question[] = [
  makeQuestion('gs_nov_mc', 'git_status', 'novice', 'multiple_choice'),
  makeQuestion('gs_par_mc', 'git_status', 'partial', 'multiple_choice'),
  makeQuestion('gs_par_fill', 'git_status', 'partial', 'fill_command'),
  makeQuestion('gs_mas_sc', 'git_status', 'mastery', 'scenario'),
  makeQuestion('cm_nov_mc', 'commit_message', 'novice', 'multiple_choice'),
  makeQuestion('cm_par_msg', 'commit_message', 'partial', 'fill_message'),
  makeQuestion('cm_mas_sc', 'commit_message', 'mastery', 'scenario'),
];

// --- Type gating ---

test('novice student only receives multiple_choice questions', () => {
  const states = [makeState('git_status', 'novice'), makeState('commit_message', 'novice')];
  const answered = new Set<string>();

  for (let i = 0; i < 10; i++) {
    const q = selectNext(states, answered, QUESTIONS);
    if (q === 'complete') break;
    assert.equal(q.type, 'multiple_choice');
    answered.add(q.id);
  }
});

test('partial student can receive fill_command and fill_message questions', () => {
  const states = [makeState('git_status', 'partial'), makeState('commit_message', 'partial')];
  const answered = new Set<string>();
  const types = new Set<string>();

  for (let i = 0; i < 20; i++) {
    const q = selectNext(states, answered, QUESTIONS);
    if (q === 'complete') break;
    types.add(q.type);
    answered.add(q.id);
  }

  assert.ok(types.has('fill_command') || types.has('fill_message'));
});

test('mastery student can receive scenario questions', () => {
  const states = [makeState('git_status', 'mastery', 0.5), makeState('commit_message', 'mastery', 0.5)];
  const answered = new Set<string>();
  const types = new Set<string>();

  for (let i = 0; i < 10; i++) {
    const q = selectNext(states, answered, QUESTIONS);
    if (q === 'complete') break;
    types.add(q.type);
    answered.add(q.id);
  }

  assert.ok(types.has('scenario'));
});

// --- Answered exclusion ---

test('already-answered questions are not returned', () => {
  const states = [makeState('git_status', 'novice'), makeState('commit_message', 'novice')];
  const answered = new Set(['gs_nov_mc', 'cm_nov_mc']);

  const q = selectNext(states, answered, QUESTIONS);
  assert.equal(q, 'complete');
});

// --- Complete ---

test('returns complete when no questions remain for active KCs', () => {
  const states = [
    makeState('git_status', 'novice'),
    makeState('commit_message', 'novice'),
  ];
  const answered = new Set(['gs_nov_mc', 'cm_nov_mc']);

  const result = selectNext(states, answered, QUESTIONS);
  assert.equal(result, 'complete');
});

test('routes to other KC when one is done', () => {
  const states = [
    makeState('git_status', 'mastery', 0.9),   // done (mastery + score >= 0.8)
    makeState('commit_message', 'novice', 0.0), // not done
  ];
  const answered = new Set<string>();

  const q = selectNext(states, answered, QUESTIONS);
  assert.notEqual(q, 'complete');
  if (q !== 'complete') {
    assert.equal(q.kc, 'commit_message');
  }
});

// --- getPendingIntervention ---

test('getPendingIntervention returns first non-null intervention', () => {
  const states = [
    makeState('git_status', 'novice'),
    { ...makeState('commit_message', 'novice'), pending_intervention: 'misc_messages_only_for_self' },
  ];
  assert.equal(getPendingIntervention(states), 'misc_messages_only_for_self');
});

test('getPendingIntervention returns null when none pending', () => {
  const states = [makeState('git_status', 'novice'), makeState('commit_message', 'novice')];
  assert.equal(getPendingIntervention(states), null);
});
