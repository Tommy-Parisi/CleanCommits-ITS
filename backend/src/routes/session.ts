import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
  getOrCreateStudent, initKCState, createSession, getSession,
  updateSessionEngineState, getKCStates, upsertKCState,
  clearPendingIntervention, insertAttempt, getAnsweredQuestionIds,
  DEFAULT_ENGINE_STATE,
  type EngineState,
} from '../db';
import { questions, interventions } from '../questions';
import { toSnapshot } from '../snapshots';
import { getPendingIntervention, selectNext } from '../engine/questionSelector';
import { getNextHint, recordWrongAnswer, isRevealUnlocked } from '../engine/hintManager';
import { evaluate } from '../engine/answerEvaluator';
import { updateKCState } from '../engine/studentModel';
import type { StartSessionResponse, NextQuestionResponse, SubmitAnswerRequest } from '@its/shared';

const KC_IDS = ['git_status', 'commit_message'] as const;

const router = new Hono();

function parseEngineState(raw: string): EngineState {
  try {
    const parsed = JSON.parse(raw);
    return {
      currentQuestionId: parsed.currentQuestionId ?? null,
      hintsUsed:         parsed.hintsUsed         ?? 0,
      wrongAfterHint3:   parsed.wrongAfterHint3   ?? 0,
      revealed:          parsed.revealed           ?? false,
    };
  } catch {
    return { ...DEFAULT_ENGINE_STATE };
  }
}

// POST /api/session/start
router.post('/start', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { student_id?: string };
  const studentId = body.student_id ?? randomUUID();
  const sessionId  = randomUUID();

  getOrCreateStudent(studentId);
  createSession(sessionId, studentId);

  for (const kcId of KC_IDS) {
    initKCState(studentId, kcId);
  }

  const kcStates = getKCStates(studentId);
  const response: StartSessionResponse = {
    sessionId,
    studentId,
    kcStates: kcStates.map(toSnapshot),
  };

  return c.json(response, 201);
});

// GET /api/session/:id/next
router.get('/:id/next', (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ detail: 'Session not found' }, 404);

  const kcStates    = getKCStates(session.student_id);
  const engineState = parseEngineState(session.engine_state);

  // Intervention takes priority over the next question
  const kcWithPending = kcStates.find(s => s.pending_intervention !== null);
  if (kcWithPending) {
    clearPendingIntervention(session.student_id, kcWithPending.kc_id);
    const response: NextQuestionResponse = {
      type:            'intervention',
      misconceptionKey: kcWithPending.pending_intervention!,
      message:          interventions[kcWithPending.pending_intervention!] ?? '',
    };
    return c.json(response);
  }

  const answered = new Set(getAnsweredQuestionIds(session.id));
  const next      = selectNext(kcStates, answered, questions);

  if (next === 'complete') {
    return c.json({ type: 'complete' } satisfies NextQuestionResponse);
  }

  const newEngineState: EngineState = {
    currentQuestionId: next.id,
    hintsUsed:         0,
    wrongAfterHint3:   0,
    revealed:          false,
  };
  updateSessionEngineState(session.id, newEngineState);

  const response: NextQuestionResponse = {
    type:         'question',
    questionId:   next.id,
    kc:           next.kc,
    questionType: next.type,
    scenario:     next.scenario,
    question:     next.question,
    choices:      next.choices,
    hintsUsed:    0,
    hintsTotal:   3,
  };
  return c.json(response);
});

// POST /api/session/:id/answer
router.post('/:id/answer', async (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ detail: 'Session not found' }, 404);

  const body = await c.req.json().catch(() => null) as SubmitAnswerRequest | null;
  if (!body?.questionId || body.answer === undefined) {
    return c.json({ detail: 'questionId and answer are required' }, 400);
  }

  const engineState = parseEngineState(session.engine_state);
  if (engineState.revealed) {
    return c.json({ detail: 'Question already completed — call /next for the next question' }, 400);
  }

  const question = questions.find(q => q.id === body.questionId);
  if (!question) return c.json({ detail: 'Question not found' }, 404);

  const kcStates = getKCStates(session.student_id);
  const kcState  = kcStates.find(s => s.kc_id === question.kc);
  if (!kcState) return c.json({ detail: 'KC state not initialised' }, 500);

  const { isCorrect, misconceptionKey } = evaluate(question, body.answer);

  if (isCorrect) {
    insertAttempt({
      session_id:              session.id,
      student_id:              session.student_id,
      question_id:             question.id,
      kc_id:                   question.kc,
      answer:                  body.answer,
      is_correct:              1,
      was_reveal:              0,
      hints_used:              engineState.hintsUsed,
      misconception_triggered: null,
    });

    const updated = updateKCState(kcState, true, engineState.hintsUsed, misconceptionKey);
    upsertKCState(updated);

    return c.json({
      isCorrect:  true,
      feedback:   question.feedback.correct,
      revealShown: false,
      revealText: null,
      kcStates:   getKCStates(session.student_id).map(toSnapshot),
    });
  }

  // Wrong answer — update hint state, check reveal
  const updatedHints   = recordWrongAnswer(engineState);
  const revealReady    = isRevealUnlocked(updatedHints);
  const newEngineState = { ...engineState, ...updatedHints };

  insertAttempt({
    session_id:              session.id,
    student_id:              session.student_id,
    question_id:             question.id,
    kc_id:                   question.kc,
    answer:                  body.answer,
    is_correct:              0,
    was_reveal:              revealReady ? 1 : 0,
    hints_used:              engineState.hintsUsed,
    misconception_triggered: misconceptionKey,
  });

  const updated = updateKCState(kcState, false, engineState.hintsUsed, misconceptionKey);
  upsertKCState(updated);

  if (revealReady) {
    updateSessionEngineState(session.id, { ...newEngineState, revealed: true });
    return c.json({
      isCorrect:   false,
      feedback:    question.reveal,
      revealShown: true,
      revealText:  question.reveal,
      kcStates:    getKCStates(session.student_id).map(toSnapshot),
    });
  }

  updateSessionEngineState(session.id, newEngineState);
  return c.json({
    isCorrect:   false,
    feedback:    question.feedback.incorrect,
    revealShown: false,
    revealText:  null,
    kcStates:    getKCStates(session.student_id).map(toSnapshot),
  });
});

// POST /api/session/:id/hint
router.post('/:id/hint', async (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ detail: 'Session not found' }, 404);

  const engineState = parseEngineState(session.engine_state);

  if (!engineState.currentQuestionId) {
    return c.json({ detail: 'No active question — call /next first' }, 400);
  }
  if (engineState.revealed) {
    return c.json({ detail: 'Question already completed' }, 400);
  }

  const question = questions.find(q => q.id === engineState.currentQuestionId);
  if (!question) return c.json({ detail: 'Active question not found' }, 500);

  const { hintText, hintNumber, revealUnlocked, newState } = getNextHint(question.hints, engineState);
  updateSessionEngineState(session.id, { ...engineState, ...newState });

  return c.json({ hintNumber, hintText, revealUnlocked });
});

export default router;
