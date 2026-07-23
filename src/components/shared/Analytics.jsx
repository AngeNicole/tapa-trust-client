import { BarChart } from './Charts.jsx';

// A short human label for a booking's current stage (shared by the activity feed).
export function stageLabel(b) {
  if (b.status === 'completed') return 'Completed';
  if (b.status === 'cancelled') return 'Cancelled';
  if (b.status === 'in_progress') return b.checkedOut ? 'Awaiting completion' : 'In progress';
  if (b.status === 'accepted') return b.checkedIn ? 'Checked in' : 'Accepted';
  return 'Pending acceptance';
}

// Build a recent-activity feed from the bookings a dashboard already has.
export function bookingActivity(bookings = [], role) {
  return [...bookings]
    .sort((a, b) => b.booking_id - a.booking_id)
    .slice(0, 7)
    .map((b) => ({
      status: b.status,
      label: stageLabel(b),
      sub: `${b.taskTitle} · ${role === 'worker' ? b.requesterName : b.workerName}`,
    }));
}

// Soft-tinted stat cards (icon tile + label + big number). Tones rotate across
// the row for a lively-but-tasteful look; pass `tone` on a kpi to pin one.
// Shared by the dashboards and the Earnings page so stats look consistent.
const KPI_TONES = ['primary', 'success', 'info', 'neutral'];
export function KpiGrid({ kpis = [] }) {
  return (
    <div className="kpi-grid">
      {kpis.map((k, i) => (
        <div className={`kpi-card kpi-card--${k.tone || KPI_TONES[i % KPI_TONES.length]}`} key={k.label}>
          {k.icon && <span className="kpi-ic">{k.icon}</span>}
          <div className="kpi-body">
            <div className="kpi-lbl">{k.label}</div>
            <div className="kpi-num">{k.value}</div>
            {k.hint && <div className="kpi-hint">{k.hint}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic analytics/overview page: KPI tiles + a chart + a recent-activity feed.
// Each dashboard computes its own numbers and passes them in.
export function Analytics({ title = 'Dashboard', subtitle, kpis = [], chart, activity = [] }) {
  return (
    <>
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}

      <KpiGrid kpis={kpis} />

      <div className="analytics-row">
        {chart && (
          <div className="card">
            <div className="card-head" style={{ marginBottom: '0.75rem' }}>
              <div className="card-title">{chart.title}</div>
              {chart.note && <span className="meta">{chart.note}</span>}
            </div>
            {chart.data?.length
              ? <BarChart data={chart.data} format={chart.format} />
              : <p className="meta">No data yet.</p>}
          </div>
        )}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>Recent activity</div>
          {activity.length === 0 ? (
            <p className="meta" style={{ marginTop: '0.5rem' }}>No activity yet.</p>
          ) : (
            <div className="activity">
              {activity.map((a, i) => (
                <div className="activity-row" key={i}>
                  <span className={`activity-dot activity-dot--${a.status}`} />
                  <div>
                    <div className="meta" style={{ color: 'var(--color-text-strong-950)', fontWeight: 600 }}>{a.label}</div>
                    <div className="meta">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
