// Small presentational helpers shared by the demo dashboards.

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
  released: { cls: 'badge--done', label: 'Payment: released' },
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

export function Loading({ label = 'Loading…' }) {
  return <div className="empty" style={{ marginTop: '0.75rem' }}>{label}</div>;
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
