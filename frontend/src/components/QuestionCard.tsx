import { useEffect, useState } from 'react';
import type { QuestionItem } from '../types';

interface Props {
  question: QuestionItem;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

const KC_LABELS: Record<string, string> = {
  git_status: 'Reading git status',
  commit_message: 'Writing commit messages',
};

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  fill_command: 'Fill Command',
  fill_message: 'Fill Message',
  scenario: 'Scenario',
};

function CharCounter({ text, limit }: { text: string; limit: number }) {
  const subjectLine = text.split('\n')[0];
  const count = subjectLine.length;
  const over = count > limit;
  return (
    <span className={`char-counter${over ? ' over' : ''}`}>
      {count}/{limit}
    </span>
  );
}

export function QuestionCard({ question, onSubmit, disabled }: Props) {
  const [answer, setAnswer] = useState('');

  // Reset input when the question changes (new question from server, not try-again)
  useEffect(() => {
    setAnswer('');
  }, [question.questionId]);

  const handleMCSelect = (key: string) => {
    if (!disabled) setAnswer(key);
  };

  const handleMCSubmit = () => {
    if (answer) onSubmit(answer);
  };

  const handleFillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) onSubmit(answer.trim());
  };

  return (
    <div className="question-card">
      <div className="question-tag-bar">
        <span className="tag tag-kc">{KC_LABELS[question.kc] ?? question.kc}</span>
        <span className="tag tag-type">{TYPE_LABELS[question.questionType] ?? question.questionType}</span>
      </div>

      {question.scenario && (
        <pre className="scenario-block">
          <code>{question.scenario}</code>
        </pre>
      )}

      <p className="question-text">{question.question}</p>

      {(question.questionType === 'multiple_choice' || question.questionType === 'scenario') && question.choices ? (
        <div className="choices">
          {Object.entries(question.choices).map(([key, text]) => (
            <button
              key={key}
              className={`choice-btn${answer === key ? ' selected' : ''}`}
              onClick={() => handleMCSelect(key)}
              disabled={disabled}
            >
              <span className="choice-key">{key}.</span>
              {text}
            </button>
          ))}
          <button
            className="submit-btn"
            onClick={handleMCSubmit}
            disabled={disabled || !answer}
          >
            Submit
          </button>
        </div>
      ) : (
        <form className="fill-form" onSubmit={handleFillSubmit}>
          {question.questionType === 'fill_command' ? (
            <div className="terminal-input">
              <span className="terminal-prompt">$</span>
              <input
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={disabled}
                placeholder="type your git command…"
                autoFocus={!disabled}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <>
              <textarea
                className="message-input"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                disabled={disabled}
                placeholder="Write your commit message…"
                rows={3}
                autoFocus={!disabled}
                spellCheck={false}
              />
              <CharCounter text={answer} limit={50} />
            </>
          )}
          <button
            type="submit"
            className="submit-btn"
            disabled={disabled || !answer.trim()}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
