import { Icons } from './shared/icons.jsx';

// First-run welcome / get-started screen, shown once per role on the dashboard.
// Presentational — the dashboard supplies the copy, the feature cards, the
// action card(s), and an onSkip handler ("Skip for now, go to dashboard").
export function WelcomeGetStarted({ name, subtitle, features = [], actions = [], onSkip }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <span className="welcome-hero-ic">{Icons.spark}</span>
        <h1 className="welcome-title">Welcome, {first}!</h1>
        {subtitle && <p className="welcome-sub">{subtitle}</p>}
      </div>

      {features.length > 0 && (
        <div className="welcome-features">
          {features.map((f) => (
            <div className="welcome-feature" key={f.title}>
              <span className="welcome-feature-ic">{f.icon}</span>
              <div className="welcome-feature-t">{f.title}</div>
              <p className="welcome-feature-d">{f.desc}</p>
            </div>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <>
          <h2 className="welcome-q">What would you like to do?</h2>
          <div className="welcome-actions">
            {actions.map((a, i) => (
              <div className={`welcome-action ${i === 0 ? 'is-primary' : ''}`} key={a.title}>
                <span className="welcome-action-ic">{a.icon}</span>
                <div className="welcome-action-t">{a.title}</div>
                <p className="welcome-action-d">{a.desc}</p>
                <button type="button" className={i === 0 ? 'btn-primary' : 'btn-secondary'} onClick={a.onClick}>
                  {a.cta} <span aria-hidden="true">→</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" className="welcome-skip" onClick={onSkip}>
        Skip for now, go to dashboard
      </button>
    </div>
  );
}
