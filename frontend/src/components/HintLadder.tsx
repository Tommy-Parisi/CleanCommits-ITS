import { useEffect, useState } from 'react';
import type { HintData } from '../types';

interface Props {
  hintData: HintData;
  hintsTotal: number;
  onRequestHint: () => void;
  readOnly?: boolean;
  hintAvailable?: boolean;
}

export function HintLadder({ hintData, hintsTotal, onRequestHint, readOnly = false, hintAvailable = false }: Props) {
  const { hints, revealUnlocked } = hintData;
  const hintsUsed = hints.length;
  const exhausted = hintsUsed >= hintsTotal;
  const [showNudge, setShowNudge] = useState(false);

  // Clear nudge when the hint becomes available or a new hint is taken
  useEffect(() => { setShowNudge(false); }, [hintAvailable, hintsUsed]);

  const buttonLabel = revealUnlocked
    ? 'Reveal available — submit again'
    : exhausted
      ? 'All hints shown'
      : `Get a hint (${hintsUsed}/${hintsTotal})`;

  const canNudge = !readOnly && !hintAvailable && !exhausted && hintsUsed > 0 && !revealUnlocked;

  // Don't render anything if no hints exist and in read-only mode
  if (readOnly && hintsUsed === 0) return null;

  return (
    <div className="hint-ladder">
      <div className="hint-header">
        <span className="hint-count">Hints {hintsUsed}/{hintsTotal}</span>
        {!readOnly && (
          <div className="hint-btn-group">
            {/* wrapper captures clicks on disabled button */}
            <div onClick={() => canNudge && setShowNudge(true)}>
              <button
                className="hint-btn"
                onClick={(e) => { e.stopPropagation(); onRequestHint(); }}
                disabled={exhausted || !hintAvailable}
              >
                {buttonLabel}
              </button>
            </div>
            {showNudge && (
              <span className="hint-retry-nudge">Try again to unlock the next hint</span>
            )}
          </div>
        )}
        {readOnly && revealUnlocked && (
          <span className="reveal-notice">Reveal available — submit again</span>
        )}
      </div>

      {hints.map((text, i) => (
        <div key={i} className="hint-item">
          <span className="hint-number">Hint {i + 1}</span>
          <p className="hint-text">{text}</p>
        </div>
      ))}
    </div>
  );
}
