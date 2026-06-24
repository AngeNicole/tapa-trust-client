function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

// A short human label for a booking's current stage.
function stageLabel(b) {
  if (b.status === 'completed') return 'Completed';
  if (b.status === 'in_progress') return b.checkedOut ? 'Awaiting completion' : 'In progress';
  if (b.status === 'accepted') return b.checkedIn ? 'Checked in' : 'Accepted';
  return 'Pending acceptance';
}

// Right-rail panel: greeting + KPIs + a recent-activity feed, all derived
// from the bookings the dashboard already has.
export function StatsRail({ user, bookings = [], role }) {
  const active = bookings.filter((b) => b.status !== 'completed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const first = (user?.name || '').split(/\s+/)[0] || 'there';

  // newest first; bookings have incrementing ids
  const recent = [...bookings].sort((a, b) => b.booking_id - a.booking_id).slice(0, 6);

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

      <div className="divider" />
      <div className="card-title">Recent activity</div>
      {recent.length === 0 ? (
        <p className="meta" style={{ marginTop: '0.5rem' }}>No activity yet.</p>
      ) : (
        <div className="activity">
          {recent.map((b) => (
            <div className="activity-row" key={b.booking_id}>
              <span className={`activity-dot activity-dot--${b.status}`} />
              <div>
                <div className="meta" style={{ color: 'var(--color-text-strong-950)', fontWeight: 600 }}>
                  {stageLabel(b)}
                </div>
                <div className="meta">
                  {b.taskTitle} · {role === 'worker' ? b.requesterName : b.workerName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
