import type { KCId, QuestionType, ConceptualLevel } from '@its/shared';
import rawData from '../data/questions.json';

export interface Question {
  id: string;
  kc: KCId;
  type: QuestionType;
  targetLevel: ConceptualLevel;
  scenario: string | null;
  question: string;
  choices: Record<string, string> | null;
  correct: string | null;
  acceptedAnswers: string[] | null;
  bodyRequired: boolean;
  misconceptionTriggers: Record<string, string>;
  hints: string[];
  reveal: string;
  feedback: { correct: string; incorrect: string };
}

const VALID_KCS: KCId[] = ['git_status', 'commit_message'];
const VALID_TYPES: QuestionType[] = ['multiple_choice', 'fill_command', 'fill_message', 'scenario'];
const VALID_LEVELS: ConceptualLevel[] = ['novice', 'partial', 'mastery'];

function validate(raw: unknown[]): Question[] {
  const errors: string[] = [];

  const questions = raw.map((q: unknown, i: number) => {
    const question = q as Record<string, unknown>;
    const id = question.id as string ?? `[index ${i}]`;
    const err = (msg: string) => errors.push(`${id}: ${msg}`);

    if (!question.id || typeof question.id !== 'string') err('missing id');
    if (!VALID_KCS.includes(question.kc as KCId)) err(`invalid kc "${question.kc}"`);
    if (!VALID_TYPES.includes(question.type as QuestionType)) err(`invalid type "${question.type}"`);
    if (!VALID_LEVELS.includes(question.targetLevel as ConceptualLevel)) err(`invalid targetLevel "${question.targetLevel}"`);
    if (!question.question || typeof question.question !== 'string') err('missing question text');
    if (!Array.isArray(question.hints) || question.hints.length !== 3) err('hints must be an array of exactly 3 strings');
    if (!question.reveal || typeof question.reveal !== 'string') err('missing reveal');
    if (!question.feedback || typeof (question.feedback as Record<string, unknown>).correct !== 'string') err('missing feedback.correct');
    if (!question.feedback || typeof (question.feedback as Record<string, unknown>).incorrect !== 'string') err('missing feedback.incorrect');

    const type = question.type as QuestionType;
    if (type === 'multiple_choice' || type === 'scenario') {
      if (!question.choices || typeof question.choices !== 'object') err('multiple_choice/scenario requires choices');
      if (!question.correct || typeof question.correct !== 'string') err('multiple_choice/scenario requires correct');
    }
    if (type === 'fill_command') {
      if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length === 0) {
        err('fill_command requires acceptedAnswers array');
      }
    }

    return q as Question;
  });

  if (errors.length > 0) {
    throw new Error(`Question bank validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return questions;
}

const data = rawData as { questions: unknown[]; interventions: Record<string, string> };

export const questions: Question[] = validate(data.questions);
export const interventions: Record<string, string> = data.interventions;

if (require.main === module) {
  const byKC = VALID_KCS.map(kc => {
    const qs = questions.filter(q => q.kc === kc);
    return `  ${kc}: ${qs.length} (${VALID_LEVELS.map(l => `${l}=${qs.filter(q => q.targetLevel === l).length}`).join(', ')})`;
  }).join('\n');

  console.log(`Question bank loaded: ${questions.length} questions\n${byKC}`);
  console.log(`Interventions: ${Object.keys(interventions).length}`);
}
