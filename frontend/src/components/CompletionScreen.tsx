import type { KCStateSnapshot, ConceptualLevel } from '@its/shared';

interface Props {
  kcStates: KCStateSnapshot[];
}

const KC_LABELS: Record<string, string> = {
  git_status: 'Reading git status',
  commit_message: 'Writing commit messages',
};

const LEVEL_LABELS: Record<ConceptualLevel, string> = {
  novice: 'Novice',
  partial: 'Partial',
  mastery: 'Mastery',
};

export function CompletionScreen({ kcStates }: Props) {
  return (
    <div className="completion-screen">
      <div className="completion-icon">✓</div>
      <h2>Session Complete</h2>
      <p>You've worked through all available questions. Here's where you ended up:</p>
      <div className="completion-summary">
        {kcStates.map(s => (
          <div key={s.kcId} className="completion-kc-row">
            <span className="kc-label">{KC_LABELS[s.kcId] ?? s.kcId}</span>
            <div className="completion-kc-stats">
              <span className={`level-badge level-${s.conceptualLevel}`}>
                {LEVEL_LABELS[s.conceptualLevel]}
              </span>
              <span className="proc-pct">{Math.round(s.proceduralScore * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
