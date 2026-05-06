import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateKCState } from '../studentModel';
import type { KCStateRow } from '../../db';

function baseState(overrides: Partial<KCStateRow> = {}): Omit<KCStateRow, 'id'> {
  return {
    student_id: 'student-1',
    kc_id: 'git_status',
    conceptual_level: 'novice',
    procedural_score: 0.5,
    misc_status_shows_committed: 0,
    misc_restore_equals_staged: 0,
    misc_messages_only_for_self: 0,
    misc_message_omits_why: 0,
    pending_intervention: null,
    ...overrides,
  };
}

// --- Conceptual level ---

test('novice advances to partial on correct with no hints', () => {
  const result = updateKCState(baseState({ conceptual_level: 'novice' }), true, 0, null);
  assert.equal(result.conceptual_level, 'partial');
});

test('partial advances to mastery on correct with no hints', () => {
  const result = updateKCState(baseState({ conceptual_level: 'partial' }), true, 0, null);
  assert.equal(result.conceptual_level, 'mastery');
});

test('mastery stays at mastery', () => {
  const result = updateKCState(baseState({ conceptual_level: 'mastery' }), true, 0, null);
  assert.equal(result.conceptual_level, 'mastery');
});

test('level does not advance when hints were used', () => {
  const result = updateKCState(baseState({ conceptual_level: 'novice' }), true, 2, null);
  assert.equal(result.conceptual_level, 'novice');
});

test('level does not change on incorrect answer', () => {
  const result = updateKCState(baseState({ conceptual_level: 'partial' }), false, 0, null);
  assert.equal(result.conceptual_level, 'partial');
});

// --- Procedural score ---

test('score increases by 0.10 on correct with no hints', () => {
  const result = updateKCState(baseState({ procedural_score: 0.5 }), true, 0, null);
  assert.equal(result.procedural_score, 0.6);
});

test('score increases by 0.05 on correct with 1-2 hints', () => {
  const r1 = updateKCState(baseState({ procedural_score: 0.5 }), true, 1, null);
  assert.equal(r1.procedural_score, 0.55);
  const r2 = updateKCState(baseState({ procedural_score: 0.5 }), true, 2, null);
  assert.equal(r2.procedural_score, 0.55);
});

test('score increases by 0.02 on correct with 3 hints', () => {
  const result = updateKCState(baseState({ procedural_score: 0.5 }), true, 3, null);
  assert.ok(Math.abs(result.procedural_score - 0.52) < 0.001);
});

test('score decreases by 0.08 on incorrect', () => {
  const result = updateKCState(baseState({ procedural_score: 0.5 }), false, 0, null);
  assert.ok(Math.abs(result.procedural_score - 0.42) < 0.001);
});

test('score floor is 0.0', () => {
  const result = updateKCState(baseState({ procedural_score: 0.05 }), false, 0, null);
  assert.equal(result.procedural_score, 0);
});

test('score ceiling is 1.0', () => {
  const result = updateKCState(baseState({ procedural_score: 0.95 }), true, 0, null);
  assert.equal(result.procedural_score, 1.0);
});

// --- Misconceptions ---

test('misconception flag is set and pending_intervention written', () => {
  const result = updateKCState(baseState(), true, 0, 'misc_status_shows_committed');
  assert.equal(result.misc_status_shows_committed, 1);
  assert.equal(result.pending_intervention, 'misc_status_shows_committed');
});

test('misconception flags are sticky — already-set flag stays set', () => {
  const state = baseState({ misc_status_shows_committed: 1 });
  const result = updateKCState(state, true, 0, null);
  assert.equal(result.misc_status_shows_committed, 1);
});

test('null misconceptionKey does not set any flag', () => {
  const result = updateKCState(baseState(), true, 0, null);
  assert.equal(result.misc_status_shows_committed, 0);
  assert.equal(result.pending_intervention, null);
});
