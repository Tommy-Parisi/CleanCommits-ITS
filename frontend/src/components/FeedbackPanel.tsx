import type { SubmitAnswerResponse } from '@its/shared';

interface Props {
  result: SubmitAnswerResponse;
  onNext: () => void;
  onTryAgain: () => void;
}

export function FeedbackPanel({ result, onNext, onTryAgain }: Props) {
  const { isCorrect, feedback, revealShown } = result;

  const variant = isCorrect ? 'correct' : revealShown ? 'reveal' : 'incorrect';

  const icon = isCorrect ? '✓' : revealShown ? '→' : '✗';

  const proceedToNext = isCorrect || revealShown;

  return (
    <div className={`feedback-panel feedback-${variant}`}>
      <span className="feedback-icon" aria-hidden="true">{icon}</span>
      <div className="feedback-body">
        <p className="feedback-text">{feedback}</p>
        <div className="feedback-actions">
          {proceedToNext ? (
            <button className="btn-primary" onClick={onNext}>
              Next question →
            </button>
          ) : (
            <button className="btn-secondary" onClick={onTryAgain}>
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
