import type {
  StartSessionResponse,
  NextQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  HintRequest,
  HintResponse,
  KCStateSnapshot,
} from '@its/shared';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${init?.method ?? 'GET'} ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export function startSession(studentId?: string): Promise<StartSessionResponse> {
  return request('/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentId ? { student_id: studentId } : {}),
  });
}

export function getNextQuestion(sessionId: string): Promise<NextQuestionResponse> {
  return request(`/session/${sessionId}/next`);
}

export function submitAnswer(
  sessionId: string,
  body: SubmitAnswerRequest,
): Promise<SubmitAnswerResponse> {
  return request(`/session/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function requestHint(sessionId: string, body: HintRequest): Promise<HintResponse> {
  return request(`/session/${sessionId}/hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getStudentState(studentId: string): Promise<KCStateSnapshot[]> {
  return request(`/student/${studentId}/state`);
}
