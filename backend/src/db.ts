import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(__dirname, '../../its.db'));

// --- Schema ---

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    engine_state TEXT NOT NULL DEFAULT '{}',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kc_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL REFERENCES students(id),
    kc_id TEXT NOT NULL,
    conceptual_level TEXT NOT NULL DEFAULT 'novice',
    procedural_score REAL NOT NULL DEFAULT 0.0,
    misc_status_shows_committed INTEGER NOT NULL DEFAULT 0,
    misc_restore_equals_staged INTEGER NOT NULL DEFAULT 0,
    misc_messages_only_for_self INTEGER NOT NULL DEFAULT 0,
    misc_message_omits_why INTEGER NOT NULL DEFAULT 0,
    pending_intervention TEXT,
    UNIQUE(student_id, kc_id)
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    question_id TEXT NOT NULL,
    kc_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    was_reveal INTEGER NOT NULL DEFAULT 0,
    hints_used INTEGER NOT NULL DEFAULT 0,
    misconception_triggered TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Row types ---

export interface KCStateRow {
  id: number;
  student_id: string;
  kc_id: string;
  conceptual_level: string;
  procedural_score: number;
  misc_status_shows_committed: number;
  misc_restore_equals_staged: number;
  misc_messages_only_for_self: number;
  misc_message_omits_why: number;
  pending_intervention: string | null;
}

export interface SessionRow {
  id: string;
  student_id: string;
  engine_state: string;
  started_at: string;
  last_active: string;
}

export interface EngineState {
  currentQuestionId: string | null;
  hintsUsed: number;
  wrongAnswers: number;
  revealed: boolean;
}

export interface AttemptRow {
  id: number;
  session_id: string;
  student_id: string;
  question_id: string;
  kc_id: string;
  attempt_number: number;
  answer: string;
  is_correct: number;
  was_reveal: number;
  hints_used: number;
  misconception_triggered: string | null;
  created_at: string;
}

export const DEFAULT_ENGINE_STATE: EngineState = {
  currentQuestionId: null,
  hintsUsed: 0,
  wrongAnswers: 0,
  revealed: false,
};

// --- Query helpers ---

export function getOrCreateStudent(id: string): void {
  db.prepare('INSERT OR IGNORE INTO students (id) VALUES (?)').run(id);
}

export function initKCState(studentId: string, kcId: string): void {
  db.prepare('INSERT OR IGNORE INTO kc_states (student_id, kc_id) VALUES (?, ?)').run(studentId, kcId);
}

export function createSession(id: string, studentId: string): void {
  db.prepare('INSERT INTO sessions (id, student_id) VALUES (?, ?)').run(id, studentId);
}

export function getSession(id: string): SessionRow | undefined {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as unknown as SessionRow | undefined;
}

export function updateSessionEngineState(id: string, state: EngineState): void {
  db.prepare(
    'UPDATE sessions SET engine_state = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(JSON.stringify(state), id);
}

export function getKCStates(studentId: string): KCStateRow[] {
  return db.prepare('SELECT * FROM kc_states WHERE student_id = ?').all(studentId) as unknown as KCStateRow[];
}

export function upsertKCState(row: Omit<KCStateRow, 'id'>): void {
  db.prepare(`
    INSERT INTO kc_states
      (student_id, kc_id, conceptual_level, procedural_score,
       misc_status_shows_committed, misc_restore_equals_staged,
       misc_messages_only_for_self, misc_message_omits_why, pending_intervention)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, kc_id) DO UPDATE SET
      conceptual_level        = excluded.conceptual_level,
      procedural_score        = excluded.procedural_score,
      misc_status_shows_committed  = excluded.misc_status_shows_committed,
      misc_restore_equals_staged   = excluded.misc_restore_equals_staged,
      misc_messages_only_for_self  = excluded.misc_messages_only_for_self,
      misc_message_omits_why       = excluded.misc_message_omits_why,
      pending_intervention         = excluded.pending_intervention
  `).run(
    row.student_id, row.kc_id, row.conceptual_level, row.procedural_score,
    row.misc_status_shows_committed, row.misc_restore_equals_staged,
    row.misc_messages_only_for_self, row.misc_message_omits_why,
    row.pending_intervention
  );
}

export function clearPendingIntervention(studentId: string, kcId: string): void {
  db.prepare(
    'UPDATE kc_states SET pending_intervention = NULL WHERE student_id = ? AND kc_id = ?'
  ).run(studentId, kcId);
}

export function insertAttempt(attempt: Omit<AttemptRow, 'id' | 'attempt_number' | 'created_at'>): void {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM attempts WHERE session_id = ? AND question_id = ?'
  ).get(attempt.session_id, attempt.question_id) as unknown as { count: number };

  db.prepare(`
    INSERT INTO attempts
      (session_id, student_id, question_id, kc_id, attempt_number, answer,
       is_correct, was_reveal, hints_used, misconception_triggered)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attempt.session_id, attempt.student_id, attempt.question_id, attempt.kc_id,
    row.count + 1, attempt.answer,
    attempt.is_correct ? 1 : 0,
    attempt.was_reveal ? 1 : 0,
    attempt.hints_used,
    attempt.misconception_triggered ?? null
  );
}

export function getAnsweredQuestionIds(sessionId: string): string[] {
  const rows = db.prepare(
    'SELECT DISTINCT question_id FROM attempts WHERE session_id = ? AND (is_correct = 1 OR was_reveal = 1)'
  ).all(sessionId) as unknown as { question_id: string }[];
  return rows.map(r => r.question_id);
}

// Smoke test when run directly
if (require.main === module) {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  ).all() as unknown as { name: string }[];
  console.log('Tables:', tables.map(t => t.name).join(', '));
}
