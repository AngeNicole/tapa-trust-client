// Small presentational helpers shared by the demo dashboards.
import { useState, useEffect } from 'react';
import { Icons } from './icons.jsx';

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
        <img src={photo} alt={name || 'avatar'} loading="lazy" decoding="async" />
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

// Two-tier trust badge: admin-verified workers are Admin-Certified; everyone
// else is Unverified (and can't be booked or browsed).
const TIER = {
  'Admin-Certified': { cls: 'badge--tier-admin', icon: Icons.shield, label: 'Admin-Certified' },
  Unverified: { cls: 'badge--neutral', icon: null, label: 'Unverified' },
};
export function TierBadge({ tier }) {
  const t = TIER[tier] || TIER.Unverified;
  return <span className={`badge ${t.cls}`}>{t.icon}{t.label}</span>;
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
  // Free-tier APIs sleep when idle; the first request can take ~30s to wake.
  // After a few seconds, reassure the user it's waking rather than stuck.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="empty" style={{ marginTop: '0.75rem' }}>
      {label}
      {slow && <div className="meta" style={{ marginTop: '0.4rem' }}>Waking the server (it sleeps when idle) — this can take up to a minute the first time.</div>}
    </div>
  );
}

// Escrow status banner — makes the money flow unmistakable to BOTH parties:
// funds are held on payment, and released only once the job is confirmed done.
// role tailors the wording ("released to you" vs "to the worker").
export function EscrowBanner({ b, role }) {
  const status = b.escrow?.status || b.payment;
  const amount = b.agreedPrice ?? b.escrow?.amount;
  if (!amount || !['held', 'released', 'refunded'].includes(status)) return null;
  const isWorker = role === 'worker';

  if (status === 'held') {
    return (
      <div className="escrow-banner is-held">
        <span className="escrow-ic">{Icons.shield}</span>
        <div>
          <div className="escrow-title">{rwf(amount)} held in escrow</div>
          <div className="escrow-sub">
            {isWorker
              ? 'The requester has paid. The money is held safely and released to you once you both confirm the job is done.'
              : 'You’ve paid. The money is held safely — it’s released to the worker only after you both confirm the job is done.'}
          </div>
        </div>
      </div>
    );
  }
  if (status === 'released') {
    return (
      <div className="escrow-banner is-released">
        <span className="escrow-ic">{Icons.checkCircle}</span>
        <div>
          <div className="escrow-title">{rwf(amount)} {isWorker ? 'released to you' : 'released to the worker'}</div>
          <div className="escrow-sub">Both sides confirmed the job is complete, so the escrow has been released. {isWorker ? 'It’s in your earnings.' : 'Thanks for using TaPa Trust.'}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="escrow-banner is-refunded">
      <span className="escrow-ic">{Icons.wallet}</span>
      <div>
        <div className="escrow-title">{rwf(amount)} refunded</div>
        <div className="escrow-sub">The booking was cancelled, so the escrow was returned to the requester.</div>
      </div>
    </div>
  );
}

// "Track work" — the post-payment work phase (check-in → completion), shown as a
// labelled block with a compact stepper, separate from booking + payment (which
// live in the chat). `children` are the role-specific action buttons. The escrow
// banner sits on top so both parties always see the held → released money flow.
export function WorkTracker({ b, role, children }) {
  const steps = [
    { label: 'Checked in', done: b.checkedIn },
    { label: 'Start confirmed', done: b.startConfirmed },
    { label: 'Checked out', done: b.checkedOut },
    { label: 'Completed', done: b.status === 'completed' },
  ];
  return (
    <div className="track-work">
      <EscrowBanner b={b} role={role} />
      <div className="track-work-head">Track work</div>
      <div className="track-steps">
        {steps.map((s) => (
          <span key={s.label} className={`track-step ${s.done ? 'is-done' : ''}`}>
            <i className="track-dot" />{s.label}
          </span>
        ))}
      </div>
      {children && <div className="track-actions">{children}</div>}
    </div>
  );
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
