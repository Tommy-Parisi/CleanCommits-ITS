import type { KCStateRow } from '../db';
import type { Question } from '../questions';
import type { ConceptualLevel, QuestionType } from '@its/shared';

const LEVEL_ORDER: ConceptualLevel[] = ['novice', 'partial', 'mastery'];

const ALLOWED_TYPES: Record<ConceptualLevel, QuestionType[]> = {
  novice:  ['multiple_choice'],
  partial: ['multiple_choice', 'fill_command', 'fill_message'],
  mastery: ['multiple_choice', 'fill_command', 'fill_message', 'scenario'],
};

function levelScore(state: KCStateRow): number {
  return LEVEL_ORDER.indexOf(state.conceptual_level as ConceptualLevel) + state.procedural_score;
}

function isComplete(state: KCStateRow): boolean {
  return state.conceptual_level === 'mastery' && state.procedural_score >= 0.8;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getPendingIntervention(kcStates: KCStateRow[]): string | null {
  for (const state of kcStates) {
    if (state.pending_intervention) return state.pending_intervention;
  }
  return null;
}

export function selectNext(
  kcStates: KCStateRow[],
  answered: Set<string>,
  questions: Question[]
): Question | 'complete' {
  // Route to the KC with more room to grow; skip KCs that are done
  const active = kcStates
    .filter(s => !isComplete(s))
    .sort((a, b) => levelScore(a) - levelScore(b));

  // Try each KC in priority order
  for (const state of active) {
    const level = state.conceptual_level as ConceptualLevel;
    const allowedTypes = ALLOWED_TYPES[level];

    const candidates = questions.filter(
      q =>
        q.kc === state.kc_id &&
        q.targetLevel === level &&
        allowedTypes.includes(q.type) &&
        !answered.has(q.id)
    );

    if (candidates.length > 0) {
      return shuffle(candidates)[0];
    }
  }

  return 'complete';
}
