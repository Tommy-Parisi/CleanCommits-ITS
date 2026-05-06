import type { Question } from '../questions';

const IMPERATIVE_VERBS = new Set([
  'add', 'allow', 'bump', 'catch', 'change', 'clean', 'configure', 'convert',
  'create', 'delete', 'deploy', 'disable', 'document', 'enable', 'enforce',
  'ensure', 'expose', 'extract', 'fix', 'format', 'handle', 'hide', 'implement',
  'improve', 'initialize', 'merge', 'migrate', 'move', 'optimize', 'prevent',
  'refactor', 'remove', 'rename', 'replace', 'reset', 'restore', 'restructure',
  'revert', 'sanitize', 'simplify', 'skip', 'split', 'switch', 'test',
  'update', 'upgrade', 'validate', 'wrap',
]);

const PAST_TENSE_VERBS = new Set([
  'added', 'allowed', 'bumped', 'caught', 'changed', 'cleaned', 'configured',
  'converted', 'created', 'deleted', 'deployed', 'disabled', 'documented',
  'enabled', 'enforced', 'ensured', 'exposed', 'extracted', 'fixed', 'formatted',
  'handled', 'hid', 'implemented', 'improved', 'initialized', 'merged',
  'migrated', 'moved', 'optimized', 'prevented', 'refactored', 'removed',
  'renamed', 'replaced', 'resetted', 'restored', 'restructured', 'reverted',
  'sanitized', 'simplified', 'skipped', 'switched', 'tested', 'updated',
  'upgraded', 'validated', 'wrapped',
]);

const PRESENT_PARTICIPLES = new Set([
  'adding', 'allowing', 'bumping', 'catching', 'changing', 'cleaning',
  'configuring', 'converting', 'creating', 'deleting', 'deploying', 'disabling',
  'documenting', 'enabling', 'enforcing', 'ensuring', 'exposing', 'extracting',
  'fixing', 'formatting', 'handling', 'hiding', 'implementing', 'improving',
  'initializing', 'merging', 'migrating', 'moving', 'optimizing', 'preventing',
  'refactoring', 'removing', 'renaming', 'replacing', 'resetting', 'restoring',
  'restructuring', 'reverting', 'sanitizing', 'simplifying', 'skipping',
  'splitting', 'switching', 'testing', 'updating', 'upgrading', 'validating',
  'wrapping',
]);

// Entire subject line is too vague to be useful
const VAGUE_EXACT = new Set([
  'fix', 'update', 'wip', 'changes', 'stuff', 'misc', 'tweaks', 'cleanup',
  'patch', 'hotfix', 'temp', 'bug fix', 'bug fixes', 'fix stuff', 'more changes',
  'various fixes', 'minor fix', 'small fix', 'work in progress', 'refactor',
  'updates', 'fixes',
]);

export interface EvalResult {
  isCorrect: boolean;
  misconceptionKey: string | null;
}

export function evaluate(question: Question, rawAnswer: string): EvalResult {
  const answer = rawAnswer.trim();

  switch (question.type) {
    case 'multiple_choice':
    case 'scenario':
      return evaluateMC(question, answer);

    case 'fill_command':
      return evaluateFillCommand(question, answer);

    case 'fill_message':
      return evaluateFillMessage(question, answer);
  }
}

function evaluateMC(question: Question, answer: string): EvalResult {
  const choice = answer.toLowerCase();
  const isCorrect = choice === question.correct?.toLowerCase();
  const misconceptionKey = question.misconceptionTriggers[choice] ?? null;
  return { isCorrect, misconceptionKey };
}

function evaluateFillCommand(question: Question, answer: string): EvalResult {
  const normalized = answer.toLowerCase().replace(/\s+/g, ' ').trim();
  const isCorrect = (question.acceptedAnswers ?? []).some(
    accepted => accepted.toLowerCase().replace(/\s+/g, ' ').trim() === normalized
  );
  return { isCorrect, misconceptionKey: null };
}

function evaluateFillMessage(question: Question, rawAnswer: string): EvalResult {
  const [subjectRaw = '', ...bodyParts] = rawAnswer.split(/\n\n+/);
  const subject = subjectRaw.trim();
  const body = bodyParts.join('\n\n').trim();

  if (subject.length === 0) {
    return { isCorrect: false, misconceptionKey: null };
  }

  // Check 1: length
  if (subject.length > 50) {
    return { isCorrect: false, misconceptionKey: null };
  }

  // Check 2: imperative mood
  const firstWord = subject.split(/\s+/)[0].toLowerCase();
  if (
    !IMPERATIVE_VERBS.has(firstWord) ||
    PAST_TENSE_VERBS.has(firstWord) ||
    PRESENT_PARTICIPLES.has(firstWord)
  ) {
    return { isCorrect: false, misconceptionKey: null };
  }

  // Check 3: not vague
  if (VAGUE_EXACT.has(subject.toLowerCase())) {
    return { isCorrect: false, misconceptionKey: null };
  }

  // Check 4: body required
  if (question.bodyRequired && body.length === 0) {
    return { isCorrect: false, misconceptionKey: 'misc_message_omits_why' };
  }

  return { isCorrect: true, misconceptionKey: null };
}
