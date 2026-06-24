import { BarChart } from '../demo/Charts.jsx';

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

// Right-rail "Statistic" panel: greeting + KPIs + a small status bar chart,
// all derived from the bookings the dashboard already has.
export function StatsRail({ user, bookings = [], role }) {
  const by = (s) => bookings.filter((b) => b.status === s).length;
  const active = bookings.filter((b) => b.status !== 'completed').length;
  const completed = by('completed');
  const first = (user?.name || '').split(/\s+/)[0] || 'there';

  const chart = [
    { label: 'New', value: by('pending') },
    { label: 'Acc', value: by('accepted') },
    { label: 'Prog', value: by('in_progress') },
    { label: 'Done', value: completed },
  ];

  return (
    <div className="rail-card">
      <div className="rail-greet">
        <div className="rail-avatar">{initials(user?.name)}</div>
        <div className="card-title">Good day, {first} 🔥</div>
        <div className="meta" style={{ marginTop: '0.25rem' }}>
          {role === 'worker'
            ? 'Keep your jobs moving to build trust.'
            : 'Track your bookings through to done.'}
        </div>
      </div>

      <div className="rail-kpis">
        <div className="rail-kpi"><div className="stat-num">{active}</div><div className="meta">Active</div></div>
        <div className="rail-kpi"><div className="stat-num">{completed}</div><div className="meta">Completed</div></div>
      </div>

      <div className="rail-card" style={{ marginTop: '0.75rem', background: 'var(--color-bg-white-0)' }}>
        <div className="card-title" style={{ marginBottom: '0.5rem' }}>Bookings by stage</div>
        {bookings.length ? (
          <BarChart data={chart} format={(v) => v} />
        ) : (
          <span className="meta">No bookings yet.</span>
        )}
      </div>
    </div>
  );
}
