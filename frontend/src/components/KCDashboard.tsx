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

export function KCDashboard({ kcStates }: Props) {
  return (
    <div className="kc-dashboard">

      <section className="dashboard-section">
        <h3 className="dashboard-section-heading">Conceptual Knowledge</h3>
        {kcStates.map(s => (
          <div key={s.kcId} className="kc-row">
            <span className="kc-label">{KC_LABELS[s.kcId] ?? s.kcId}</span>
            <span className={`level-badge level-${s.conceptualLevel}`}>
              {LEVEL_LABELS[s.conceptualLevel]}
            </span>
          </div>
        ))}
      </section>

      <section className="dashboard-section">
        <h3 className="dashboard-section-heading">Procedural Knowledge</h3>
        {kcStates.map(s => (
          <div key={s.kcId} className="kc-proc-row">
            <div className="kc-proc-header">
              <span className="kc-label">{KC_LABELS[s.kcId] ?? s.kcId}</span>
              <span className="proc-pct">{Math.round(s.proceduralScore * 100)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${s.proceduralScore * 100}%` }}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
