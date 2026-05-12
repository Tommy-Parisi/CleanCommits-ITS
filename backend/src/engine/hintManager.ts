export interface HintState {
  hintsUsed: number;       // 0–3
  wrongAnswers: number;    // total wrong answers on this question
  revealed: boolean;
}

export const DEFAULT_HINT_STATE: HintState = {
  hintsUsed: 0,
  wrongAnswers: 0,
  revealed: false,
};

// Each hint requires a wrong answer since the previous hint (or since question start).
// Hint N is unlocked when wrongAnswers > (N - 1), i.e. wrongAnswers > hintsUsed.
export function canGetHint(state: HintState): boolean {
  return state.hintsUsed < 3 && state.wrongAnswers > state.hintsUsed;
}

export function getNextHint(
  hints: string[],
  state: HintState
): { hintText: string; hintNumber: number; revealUnlocked: boolean; newState: HintState } {
  if (state.hintsUsed >= 3) {
    return {
      hintText: hints[2],
      hintNumber: 3,
      revealUnlocked: isRevealUnlocked(state),
      newState: state,
    };
  }

  const newState: HintState = { ...state, hintsUsed: state.hintsUsed + 1 };
  return {
    hintText: hints[state.hintsUsed],
    hintNumber: newState.hintsUsed,
    revealUnlocked: isRevealUnlocked(newState),
    newState,
  };
}

export function recordWrongAnswer(state: HintState): HintState {
  if (state.revealed) return state;
  return { ...state, wrongAnswers: state.wrongAnswers + 1 };
}

export function isRevealUnlocked(state: HintState): boolean {
  // All 3 hints used and one more wrong answer after that
  return state.hintsUsed >= 3 && state.wrongAnswers > 3;
}
