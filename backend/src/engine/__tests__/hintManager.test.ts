import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextHint,
  recordWrongAnswer,
  isRevealUnlocked,
  canGetHint,
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

test('canGetHint is false with no wrong answers', () => {
  const state = { ...DEFAULT_HINT_STATE };
  assert.equal(canGetHint(state), false);
});

test('canGetHint is true after one wrong answer', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = recordWrongAnswer(state);
  assert.equal(canGetHint(state), true);
});

test('canGetHint is false after taking a hint until another wrong answer', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = recordWrongAnswer(state);                     // wrongAnswers=1, hintsUsed=0 → can get hint
  state = getNextHint(HINTS, state).newState;           // hintsUsed=1, wrongAnswers=1 → 1>1 = false
  assert.equal(canGetHint(state), false);

  state = recordWrongAnswer(state);                     // wrongAnswers=2 → 2>1 = true
  assert.equal(canGetHint(state), true);
});

test('reveal is not unlocked after hint 3 alone', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = getNextHint(HINTS, state).newState;
  state = getNextHint(HINTS, state).newState;
  const r = getNextHint(HINTS, state);
  assert.equal(r.revealUnlocked, false);
});

test('reveal unlocks after wrong answer per hint plus one more after hint 3', () => {
  // Simulate the gated flow: wrong answer required before each hint
  let state = { ...DEFAULT_HINT_STATE };

  state = recordWrongAnswer(state);                     // wrongAnswers=1
  state = getNextHint(HINTS, state).newState;           // hintsUsed=1
  state = recordWrongAnswer(state);                     // wrongAnswers=2
  state = getNextHint(HINTS, state).newState;           // hintsUsed=2
  state = recordWrongAnswer(state);                     // wrongAnswers=3
  state = getNextHint(HINTS, state).newState;           // hintsUsed=3

  assert.equal(isRevealUnlocked(state), false);

  state = recordWrongAnswer(state);                     // wrongAnswers=4
  assert.equal(isRevealUnlocked(state), true);
});

test('recordWrongAnswer always increments wrongAnswers', () => {
  let state = { ...DEFAULT_HINT_STATE };
  state = recordWrongAnswer(state);
  assert.equal(state.wrongAnswers, 1);
  state = getNextHint(HINTS, state).newState;           // hintsUsed=1
  state = recordWrongAnswer(state);
  assert.equal(state.wrongAnswers, 2);
});

test('hint request past 3 returns last hint without advancing state', () => {
  let state = { ...DEFAULT_HINT_STATE, hintsUsed: 3 };
  const r = getNextHint(HINTS, state);
  assert.equal(r.hintText, 'Hint three');
  assert.equal(r.newState.hintsUsed, 3);
});
