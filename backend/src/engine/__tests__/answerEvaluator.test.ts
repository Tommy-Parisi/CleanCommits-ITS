import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../answerEvaluator';
import type { Question } from '../../questions';

function mcQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'test_mc',
    kc: 'git_status',
    type: 'multiple_choice',
    targetLevel: 'novice',
    scenario: null,
    question: 'Test question',
    choices: { a: 'Right', b: 'Wrong', c: 'Triggers misconception' },
    correct: 'a',
    acceptedAnswers: null,
    bodyRequired: false,
    misconceptionTriggers: { c: 'misc_status_shows_committed' },
    hints: ['h1', 'h2', 'h3'],
    reveal: 'reveal text',
    feedback: { correct: 'yes', incorrect: 'no' },
    ...overrides,
  };
}

function fillCommandQuestion(acceptedAnswers: string[]): Question {
  return {
    ...mcQuestion(),
    id: 'test_fill_cmd',
    type: 'fill_command',
    choices: null,
    correct: null,
    acceptedAnswers,
    misconceptionTriggers: {},
  };
}

function fillMessageQuestion(bodyRequired = false): Question {
  return {
    ...mcQuestion(),
    id: 'test_fill_msg',
    type: 'fill_message',
    choices: null,
    correct: null,
    acceptedAnswers: null,
    bodyRequired,
    misconceptionTriggers: {},
  };
}

// --- multiple_choice ---

test('MC: correct answer', () => {
  const result = evaluate(mcQuestion(), 'a');
  assert.equal(result.isCorrect, true);
  assert.equal(result.misconceptionKey, null);
});

test('MC: incorrect answer with no misconception', () => {
  const result = evaluate(mcQuestion(), 'b');
  assert.equal(result.isCorrect, false);
  assert.equal(result.misconceptionKey, null);
});

test('MC: incorrect answer triggers misconception', () => {
  const result = evaluate(mcQuestion(), 'c');
  assert.equal(result.isCorrect, false);
  assert.equal(result.misconceptionKey, 'misc_status_shows_committed');
});

test('MC: answer is case-insensitive', () => {
  const result = evaluate(mcQuestion(), 'A');
  assert.equal(result.isCorrect, true);
});

// --- fill_command ---

test('fill_command: exact match', () => {
  const q = fillCommandQuestion(['git add login.js']);
  assert.equal(evaluate(q, 'git add login.js').isCorrect, true);
});

test('fill_command: case-insensitive match', () => {
  const q = fillCommandQuestion(['git restore --staged App.css', 'git restore --staged app.css']);
  assert.equal(evaluate(q, 'git restore --staged App.css').isCorrect, true);
  assert.equal(evaluate(q, 'git restore --staged app.css').isCorrect, true);
});

test('fill_command: normalizes whitespace', () => {
  const q = fillCommandQuestion(['git add login.js']);
  assert.equal(evaluate(q, '  git  add  login.js  ').isCorrect, true);
});

test('fill_command: wrong command', () => {
  const q = fillCommandQuestion(['git add login.js']);
  assert.equal(evaluate(q, 'git add .').isCorrect, false);
});

// --- fill_message ---

test('fill_message: valid subject passes', () => {
  const q = fillMessageQuestion();
  const result = evaluate(q, 'Fix null check to prevent auth crash');
  assert.equal(result.isCorrect, true);
  assert.equal(result.misconceptionKey, null);
});

test('fill_message: past tense fails', () => {
  const q = fillMessageQuestion();
  assert.equal(evaluate(q, 'Fixed null check to prevent auth crash').isCorrect, false);
});

test('fill_message: present participle fails', () => {
  const q = fillMessageQuestion();
  assert.equal(evaluate(q, 'Fixing null check to prevent auth crash').isCorrect, false);
});

test('fill_message: over 50 characters fails', () => {
  const q = fillMessageQuestion();
  assert.equal(evaluate(q, 'Fix the null check in the authentication middleware file').isCorrect, false);
});

test('fill_message: vague phrase fails', () => {
  const q = fillMessageQuestion();
  assert.equal(evaluate(q, 'fix').isCorrect, false);
  assert.equal(evaluate(q, 'bug fix').isCorrect, false);
  assert.equal(evaluate(q, 'wip').isCorrect, false);
});

test('fill_message: body required, body absent triggers misconception', () => {
  const q = fillMessageQuestion(true);
  const result = evaluate(q, 'Add rate limiting to protect API');
  assert.equal(result.isCorrect, false);
  assert.equal(result.misconceptionKey, 'misc_message_omits_why');
});

test('fill_message: body required, body present passes', () => {
  const q = fillMessageQuestion(true);
  const result = evaluate(q, 'Add rate limiting to protect API\n\nLimit each IP to 100 req/min.');
  assert.equal(result.isCorrect, true);
});
