import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { KCStateSnapshot, SubmitAnswerResponse } from '@its/shared';
import { startSession, getNextQuestion, submitAnswer, requestHint } from './api';
import type { HintData, QuestionItem } from './types';
import { QuestionCard } from './components/QuestionCard';
import { HintLadder } from './components/HintLadder';
import { FeedbackPanel } from './components/FeedbackPanel';
import { InterventionCard } from './components/InterventionCard';
import { KCDashboard } from './components/KCDashboard';
import { CompletionScreen } from './components/CompletionScreen';

// --- State machine ---

const EMPTY_HINTS: HintData = { hints: [], revealUnlocked: false };

type Phase =
  | { tag: 'loading' }
  | { tag: 'question'; question: QuestionItem; hintData: HintData; wrongAnswers: number }
  | { tag: 'feedback'; question: QuestionItem; result: SubmitAnswerResponse; hintData: HintData; wrongAnswers: number }
  | { tag: 'intervention'; message: string }
  | { tag: 'complete' }
  | { tag: 'error'; message: string };

type Action =
  | { type: 'QUESTION_READY'; question: QuestionItem }
  | { type: 'HINT_RECEIVED'; hintText: string; revealUnlocked: boolean }
  | { type: 'ANSWER_SUBMITTED'; result: SubmitAnswerResponse }
  | { type: 'TRY_AGAIN' }
  | { type: 'LOAD_NEXT' }
  | { type: 'INTERVENTION'; message: string }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; message: string };

function reducer(phase: Phase, action: Action): Phase {
  switch (action.type) {
    case 'QUESTION_READY':
      return { tag: 'question', question: action.question, hintData: EMPTY_HINTS, wrongAnswers: 0 };
    case 'HINT_RECEIVED':
      if (phase.tag !== 'question') return phase;
      return {
        ...phase,
        hintData: {
          hints: [...phase.hintData.hints, action.hintText],
          revealUnlocked: action.revealUnlocked,
        },
      };
    case 'ANSWER_SUBMITTED':
      if (phase.tag !== 'question') return phase;
      return { tag: 'feedback', question: phase.question, result: action.result, hintData: phase.hintData, wrongAnswers: action.result.wrongAnswers };
    case 'TRY_AGAIN':
      if (phase.tag !== 'feedback') return phase;
      return { tag: 'question', question: phase.question, hintData: phase.hintData, wrongAnswers: phase.wrongAnswers };
    case 'LOAD_NEXT':
      return { tag: 'loading' };
    case 'INTERVENTION':
      return { tag: 'intervention', message: action.message };
    case 'COMPLETE':
      return { tag: 'complete' };
    case 'ERROR':
      return { tag: 'error', message: action.message };
  }
}

// --- Component ---

export default function App() {
  const [phase, dispatch] = useReducer(reducer, { tag: 'loading' });
  const [kcStates, setKCStates] = useState<KCStateSnapshot[]>([]);
  const sessionId = useRef<string | null>(null);

  const fetchNext = useCallback(async (sid: string) => {
    try {
      const next = await getNextQuestion(sid);
      if (next.type === 'question') {
        dispatch({ type: 'QUESTION_READY', question: next });
      } else if (next.type === 'intervention') {
        dispatch({ type: 'INTERVENTION', message: next.message });
      } else {
        dispatch({ type: 'COMPLETE' });
      }
    } catch (err) {
      dispatch({ type: 'ERROR', message: String(err) });
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const storedStudentId = localStorage.getItem('its_student_id') ?? undefined;
        const session = await startSession(storedStudentId);
        localStorage.setItem('its_student_id', session.studentId);
        sessionId.current = session.sessionId;
        setKCStates(session.kcStates);
        await fetchNext(session.sessionId);
      } catch (err) {
        dispatch({ type: 'ERROR', message: String(err) });
      }
    }
    init();
  }, [fetchNext]);

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (phase.tag !== 'question' || !sessionId.current) return;
      try {
        const result = await submitAnswer(sessionId.current, {
          questionId: phase.question.questionId,
          answer,
        });
        setKCStates(result.kcStates);
        dispatch({ type: 'ANSWER_SUBMITTED', result });
      } catch (err) {
        dispatch({ type: 'ERROR', message: String(err) });
      }
    },
    [phase],
  );

  const handleHint = useCallback(async () => {
    if (phase.tag !== 'question' || !sessionId.current) return;
    try {
      const hint = await requestHint(sessionId.current, {
        questionId: phase.question.questionId,
      });
      dispatch({ type: 'HINT_RECEIVED', hintText: hint.hintText, revealUnlocked: hint.revealUnlocked });
    } catch (err) {
      dispatch({ type: 'ERROR', message: String(err) });
    }
  }, [phase]);

  const handleNext = useCallback(async () => {
    if (!sessionId.current) return;
    dispatch({ type: 'LOAD_NEXT' });
    await fetchNext(sessionId.current);
  }, [fetchNext]);

  const handleTryAgain = useCallback(() => {
    dispatch({ type: 'TRY_AGAIN' });
  }, []);

  const renderContent = () => {
    switch (phase.tag) {
      case 'loading':
        return <div className="loading">Loading…</div>;

      case 'question':
        return (
          <>
            <QuestionCard question={phase.question} onSubmit={handleSubmit} disabled={false} />
            <HintLadder
              hintData={phase.hintData}
              hintsTotal={3}
              onRequestHint={handleHint}
              hintAvailable={phase.wrongAnswers > phase.hintData.hints.length}
            />
          </>
        );

      case 'feedback':
        return (
          <>
            <QuestionCard question={phase.question} onSubmit={handleSubmit} disabled={true} />
            <HintLadder
              hintData={phase.hintData}
              hintsTotal={3}
              onRequestHint={handleHint}
              readOnly
              hintAvailable={false}
            />
            <FeedbackPanel
              result={phase.result}
              onNext={handleNext}
              onTryAgain={handleTryAgain}
            />
          </>
        );

      case 'intervention':
        return <InterventionCard message={phase.message} onContinue={handleNext} />;

      case 'complete':
        return (
          <div className="completion-wrapper">
            <CompletionScreen kcStates={kcStates} />
          </div>
        );

      case 'error':
        return (
          <div className="error-message">
            Something went wrong: {phase.message}
          </div>
        );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clean Commits</h1>
        <span className="header-subtitle">Git educated on commits!</span>
      </header>
      <div className="app-body">
        <main className="question-area">{renderContent()}</main>
        {kcStates.length > 0 && (
          <aside className="dashboard-area">
            <KCDashboard kcStates={kcStates} />
          </aside>
        )}
      </div>
    </div>
  );
}
