import type { KCStateRow } from '../db';

type KCState = Omit<KCStateRow, 'id'>;

const MISCONCEPTION_COLUMNS = {
  misc_status_shows_committed: 'misc_status_shows_committed',
  misc_restore_equals_staged: 'misc_restore_equals_staged',
  misc_messages_only_for_self: 'misc_messages_only_for_self',
  misc_message_omits_why: 'misc_message_omits_why',
} as const;

type MisconceptionKey = keyof typeof MISCONCEPTION_COLUMNS;

function isMisconceptionKey(key: string): key is MisconceptionKey {
  return key in MISCONCEPTION_COLUMNS;
}

function advanceLevel(current: KCState['conceptual_level']): KCState['conceptual_level'] {
  if (current === 'novice') return 'partial';
  if (current === 'partial') return 'mastery';
  return 'mastery';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function updateKCState(
  state: KCState,
  isCorrect: boolean,
  hintsUsed: number,
  misconceptionKey: string | null
): KCState {
  let next = { ...state };

  if (isCorrect) {
    // Conceptual: advance only on clean correct (no hints)
    if (hintsUsed === 0) {
      next.conceptual_level = advanceLevel(state.conceptual_level);
    }
    // Procedural score
    if (hintsUsed === 0) next.procedural_score = clamp(state.procedural_score + 0.10, 0, 1);
    else if (hintsUsed <= 2) next.procedural_score = clamp(state.procedural_score + 0.05, 0, 1);
    else next.procedural_score = clamp(state.procedural_score + 0.02, 0, 1);
  } else {
    next.procedural_score = clamp(state.procedural_score - 0.08, 0, 1);
  }

  // Misconceptions are sticky — once set they never clear
  if (misconceptionKey && isMisconceptionKey(misconceptionKey)) {
    (next as Record<string, unknown>)[misconceptionKey] = 1;
    next.pending_intervention = misconceptionKey;
  }

  return next;
}
