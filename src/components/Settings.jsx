import { useState } from 'react';
import { changePassword } from '../api/client.js';
import { useToast } from './Toast.jsx';
import { ErrorNote } from './shared/ui.jsx';
import { Icons } from './shared/icons.jsx';

// Tabbed settings shell used by both dashboards. The Profile tab content differs
// per role, so it's passed in; Notifications + Security are shared.
export function Settings({ profileTab }) {
  const [tab, setTab] = useState('profile');
  const tabs = [
    { key: 'profile', label: 'Profile', icon: Icons.user },
    { key: 'notifications', label: 'Notifications', icon: Icons.bell },
    { key: 'security', label: 'Security', icon: Icons.shield },
  ];
  return (
    <>
      <h1>Settings</h1>
      <p className="subtitle">Manage your profile, notifications and security.</p>
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`subtab btn-icon ${tab === t.key ? 'subtab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <div style={{ marginTop: '0.75rem' }}>{profileTab}</div>}
      {tab === 'notifications' && <NotificationsSettings />}
      {tab === 'security' && <SecuritySettings />}
    </>
  );
}

const NOTIF_KEY = 'tapa_notif_prefs';
const NOTIF_OPTS = [
  { key: 'bookings', label: 'Booking updates', hint: 'Accepted, checked in, completed.' },
  { key: 'chat', label: 'Chat & price offers', hint: 'New messages and offers on a booking.' },
  { key: 'payments', label: 'Payment updates', hint: 'Deposits held and payouts released.' },
  { key: 'product', label: 'Product news', hint: 'Occasional updates about TaPa Trust.' },
];
function loadPrefs() {
  try { return { bookings: true, chat: true, payments: true, product: false, ...(JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}) }; }
  catch { return { bookings: true, chat: true, payments: true, product: false }; }
}

function NotificationsSettings() {
  const notify = useToast();
  const [prefs, setPrefs] = useState(loadPrefs);
  function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    notify('Notification preferences saved.');
  }
  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <div className="card-title" style={{ marginBottom: '0.25rem' }}>Notifications</div>
      <p className="meta" style={{ marginBottom: '0.5rem' }}>Choose what you want to be notified about.</p>
      {NOTIF_OPTS.map((o) => (
        <div className="set-row" key={o.key}>
          <div>
            <div className="set-row-t">{o.label}</div>
            <div className="meta">{o.hint}</div>
          </div>
          <button type="button" role="switch" aria-checked={prefs[o.key]} className={`switch ${prefs[o.key] ? 'is-on' : ''}`} onClick={() => toggle(o.key)}>
            <span className="switch-knob" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SecuritySettings() {
  const notify = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (next.length < 6) { setErr('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setErr('New passwords do not match.'); return; }
    setBusy(true);
    try { await changePassword(cur, next); setCur(''); setNext(''); setConfirm(''); notify('Password updated.'); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <div className="card-title" style={{ marginBottom: '0.25rem' }}>Change password</div>
      <p className="meta" style={{ marginBottom: '0.75rem' }}>Use a strong password you don&apos;t reuse elsewhere.</p>
      <form className="form" onSubmit={submit} style={{ maxWidth: 420 }}>
        <label>Current password<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
        <label>New password<input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></label>
        <label>Confirm new password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
        <ErrorNote message={err} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-primary" type="submit" disabled={busy || !cur || !next}>{busy ? 'Updating…' : 'Update password'}</button>
        </div>
      </form>
    </div>
  );
}
