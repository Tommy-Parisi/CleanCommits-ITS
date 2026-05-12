export type ConceptualLevel = 'novice' | 'partial' | 'mastery';
export type QuestionType = 'multiple_choice' | 'fill_command' | 'fill_message' | 'scenario';
export type KCId = 'git_status' | 'commit_message';

export interface KCStateSnapshot {
  kcId: KCId;
  conceptualLevel: ConceptualLevel;
  proceduralScore: number;
  misconceptions: {
    statusShowsCommitted: boolean;
    restoreEqualsStaged: boolean;
    messagesOnlyForSelf: boolean;
    messageOmitsWhy: boolean;
  };
}

// --- API shapes ---

export interface StartSessionResponse {
  sessionId: string;
  studentId: string;
  kcStates: KCStateSnapshot[];
}

export type NextQuestionResponse =
  | {
      type: 'question';
      questionId: string;
      kc: KCId;
      questionType: QuestionType;
      scenario: string | null;
      question: string;
      choices: Record<string, string> | null;
      hintsUsed: number;
      hintsTotal: 3;
    }
  | {
      type: 'intervention';
      misconceptionKey: string;
      message: string;
    }
  | { type: 'complete' };

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  feedback: string;
  revealShown: boolean;
  revealText: string | null;
  kcStates: KCStateSnapshot[];
  wrongAnswers: number;
}

export interface HintRequest {
  questionId: string;
}

export interface HintResponse {
  hintNumber: number;
  hintText: string;
  revealUnlocked: boolean;
}
