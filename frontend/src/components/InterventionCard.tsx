interface Props {
  message: string;
  onContinue: () => void;
}

export function InterventionCard({ message, onContinue }: Props) {
  return (
    <div className="intervention-card">
      <div className="intervention-header">
        <span className="intervention-badge">Quick note</span>
      </div>
      <p className="intervention-message">{message}</p>
      <button className="btn-primary" onClick={onContinue}>
        Got it, continue →
      </button>
    </div>
  );
}
