// Small presentational helpers shared by the demo dashboards.

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
}

// Warm, varied default-avatar gradients — one is picked deterministically from
// the name, so each worker gets a friendly colour that stays stable.
const WARM = [
  'linear-gradient(135deg, var(--color-orange-400), var(--color-orange-600))',
  'linear-gradient(135deg, var(--color-red-400), var(--color-red-600))',
  'linear-gradient(135deg, var(--color-yellow-500), var(--color-orange-500))',
  'linear-gradient(135deg, var(--color-purple-400), var(--color-purple-600))',
  'linear-gradient(135deg, var(--color-orange-500), var(--color-red-500))',
  'linear-gradient(135deg, var(--color-purple-500), var(--color-red-500))',
];
function warmFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h + name.charCodeAt(i)) % WARM.length;
  return WARM[h];
}

// Avatar: a profile photo if one is set, otherwise initials on a warm gradient.
export function Avatar({ name, photo, className = 'avatar', style }) {
  if (photo) {
    return (
      <span className={className} style={{ padding: 0, overflow: 'hidden', ...style }}>
        <img src={photo} alt={name || 'avatar'} />
      </span>
    );
  }
  return <span className={className} style={{ background: warmFor(name), ...style }}>{initials(name)}</span>;
}

// Format an amount in Rwandan francs, e.g. 25000 -> "RWF 25,000".
export function rwf(n) {
  return 'RWF ' + Number(n || 0).toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(iso) {
  return MONTHS[Number(iso.slice(5, 7)) - 1] || '';
}

const STATUS = {
  pending: { cls: 'badge--neutral', label: 'Pending' },
  accepted: { cls: 'badge--info', label: 'Accepted' },
  in_progress: { cls: 'badge--progress', label: 'In progress' },
  completed: { cls: 'badge--done', label: 'Completed' },
  cancelled: { cls: 'badge--neutral', label: 'Cancelled' },
};

const PAYMENT = {
  pending: { cls: 'badge--neutral', label: 'Payment: pending' },
  confirmed: { cls: 'badge--info', label: 'Payment: confirmed' },
  held: { cls: 'badge--info', label: 'In escrow' },
  released: { cls: 'badge--done', label: 'Payment: released' },
  refunded: { cls: 'badge--neutral', label: 'Refunded' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function PaymentBadge({ payment }) {
  const p = PAYMENT[payment] || PAYMENT.pending;
  return <span className={`badge ${p.cls}`}>{p.label}</span>;
}

export function TierBadge({ tier }) {
  return <span className="badge badge--primary">{tier}</span>;
}

// Simulated verification status — a labelled status badge, not a security claim.
const VERIFY = {
  verified: { cls: 'badge--done', label: 'Verified' },
  pending: { cls: 'badge--progress', label: 'Pending review' },
  rejected: { cls: 'badge--rejected', label: 'Rejected' },
  unverified: { cls: 'badge--neutral', label: 'Unverified' },
};
export function VerifyBadge({ status }) {
  const v = VERIFY[status] || VERIFY.unverified;
  return <span className={`badge ${v.cls}`}>{v.label}</span>;
}

// Elapsed time between check-in and check-out — the platform tracks this, so
// surface it once a job has both timestamps. Returns e.g. "1h 30m" or "45m".
export function duration(startTs, endTs) {
  if (!startTs || !endTs) return null;
  const ms = new Date(endTs).getTime() - new Date(startTs).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="empty" style={{ marginTop: '0.75rem' }}>{label}</div>;
}

// Modern empty state: icon tile + title + hint + optional action, on a dashed card.
export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-ic">{icon}</span>}
      <div className="empty-title">{title}</div>
      {hint && <p className="empty-hint">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="form-error" style={{ marginTop: '0.75rem' }}>{message}</div>;
}

export function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="badge badge--star" title={`${rating} / 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)} {rating.toFixed(1)}
    </span>
  );
}
