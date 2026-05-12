import type { NextQuestionResponse } from '@its/shared';

export type QuestionItem = Extract<NextQuestionResponse, { type: 'question' }>;

export interface HintData {
  hints: string[];
  revealUnlocked: boolean;
}
