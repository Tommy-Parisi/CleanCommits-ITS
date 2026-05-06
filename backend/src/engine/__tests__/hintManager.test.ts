import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextHint,
  recordWrongAnswer,
  isRevealUnlocked,
  DEFAULT_HINT_STATE,
} from '../hintManager';

const HINTS = ['Hint one', 'Hint two', 'Hint three'];

test('returns hints in order', () => {
  let state = { ...DEFAULT_HINT_STATE };

  const r1 = getNextHint(HINTS, state);
  assert.equal(r1.hintText, 'Hint one');
  assert.equal(r1.hintNumber, 1);
  state = r1.newState;

  const r2 = getNextHint(HINTS, state);
  assert.equal(r2.hintText, 'Hint two');
  assert.equal(r2.hintNumber, 2);
  state = r2.newState;

  const r3 = getNextHint(HINTS, state);
  assert.equal(r3.hintText, 'Hint three');
  assert.equal(r3.hintNumber, 3);
});

test('reveal is not unlocked after hint 3 alone', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = getNextHint(HINTS, state).newState;
  state = getNextHint(HINTS, state).newState;
  const r = getNextHint(HINTS, state);
  assert.equal(r.revealUnlocked, false);
});

test('reveal unlocks after one wrong answer following hint 3', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = getNextHint(HINTS, state).newState;
  state = getNextHint(HINTS, state).newState;
  state = getNextHint(HINTS, state).newState;
  assert.equal(isRevealUnlocked(state), false);

  state = recordWrongAnswer(state);
  assert.equal(isRevealUnlocked(state), true);
});

test('recordWrongAnswer does not increment before hint 3', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = getNextHint(HINTS, state).newState; // hintsUsed = 1
  state = recordWrongAnswer(state);
  assert.equal(state.wrongAfterHint3, 0);
});

test('hint request past 3 returns last hint without advancing state', () => {
  let state = { ...DEFAULT_HINT_STATE, hintsUsed: 3 };
  const r = getNextHint(HINTS, state);
  assert.equal(r.hintText, 'Hint three');
  assert.equal(r.newState.hintsUsed, 3);
});
