export interface HintState {
  hintsUsed: number;       // 0–3
  wrongAfterHint3: number;
  revealed: boolean;
}

export const DEFAULT_HINT_STATE: HintState = {
  hintsUsed: 0,
  wrongAfterHint3: 0,
  revealed: false,
};

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
  if (state.hintsUsed >= 3 && !state.revealed) {
    return { ...state, wrongAfterHint3: state.wrongAfterHint3 + 1 };
  }
  return state;
}

export function isRevealUnlocked(state: HintState): boolean {
  return state.hintsUsed >= 3 && state.wrongAfterHint3 >= 1;
}
