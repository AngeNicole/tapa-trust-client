import { useState } from 'react';
import { getAdminUsers, getCategories, createCategory, getAllWorkers, verifyWorker, rejectWorker } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { Loading, ErrorNote, VerifyBadge } from '../../components/shared/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { Icons } from '../../components/shared/icons.jsx';

export default function AdminDashboard() {
  const [tab, setTab] = useState('verify');
  const users = useAsync(() => getAdminUsers(), []);
  const categories = useAsync(() => getCategories(), []);
  const workers = useAsync(() => getAllWorkers(), []);

  const pending = (workers.data || []).filter((w) => w.verification === 'pending').length;

  const items = [
    { key: 'verify', label: 'Verifications', icon: Icons.check, count: pending },
    { key: 'users', label: 'Users', icon: Icons.user, count: users.data?.length || 0 },
    { key: 'categories', label: 'Categories', icon: Icons.briefcase, count: categories.data?.length || 0 },
  ];

  return (
    <DashShell items={items} active={tab} onSelect={setTab}>
      {tab === 'verify' && <VerifyView state={workers} />}
      {tab === 'users' && <UsersView state={users} />}
      {tab === 'categories' && <CategoriesView state={categories} />}
    </DashShell>
  );
}

function VerifyView({ state }) {
  const { data, loading, error, reload } = state;
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);
  const [panel, setPanel] = useState(null); // { workerId, mode: 'redo' | 'reject' }
  const [note, setNote] = useState('');

  function openPanel(workerId, mode) {
    setErr(''); setNote(''); setPanel({ workerId, mode });
  }
  async function approve(workerId) {
    setErr(''); setBusy(workerId);
    try { await verifyWorker(workerId); reload(); } catch (e) { setErr(e.message); } finally { setBusy(null); }
  }
  async function sendBack() {
    if (!panel) return;
    if (panel.mode === 'redo' && !note.trim()) { setErr('Tell the worker what to fix before asking them to redo.'); return; }
    setErr(''); setBusy(panel.workerId);
    try { await rejectWorker(panel.workerId, note.trim()); setPanel(null); setNote(''); reload(); }
    catch (e) { setErr(e.message); } finally { setBusy(null); }
  }

  const workers = data || [];
  // Show the ones needing a decision first, then the rest for oversight.
  const order = { pending: 0, unverified: 1, verified: 2 };
  const sorted = [...workers].sort((a, b) => (order[a.verification] ?? 3) - (order[b.verification] ?? 3));
  const pendingCount = workers.filter((w) => w.verification === 'pending').length;

  return (
    <>
      <h1>Verifications</h1>
      <p className="subtitle">
        Review workers&apos; simulated identity verification. {pendingCount} awaiting a decision — approve, ask them to redo, or reject.
      </p>
      <ErrorNote message={error || err} />
      {loading ? <Loading /> : workers.length === 0 ? (
        <div className="empty" style={{ marginTop: '0.75rem' }}>No workers yet.</div>
      ) : sorted.map((w) => (
        <div className="card" key={w.worker_id}>
          <div className="card-head">
            <div>
              <div className="card-title">{w.name}</div>
              <div className="meta">{w.skills || 'No skills listed yet'} · {w.is_available ? 'Available' : 'Unavailable'}</div>
            </div>
            <div className="row">
              <VerifyBadge status={w.verification} />
              {w.verification !== 'verified' && (
                <>
                  <button className="btn-primary" disabled={busy === w.worker_id} onClick={() => approve(w.worker_id)}>
                    {busy === w.worker_id && !panel ? 'Approving…' : 'Approve'}
                  </button>
                  <button className="btn-secondary" disabled={busy === w.worker_id} onClick={() => openPanel(w.worker_id, 'redo')}>
                    Request redo
                  </button>
                  <button className="btn-danger" disabled={busy === w.worker_id} onClick={() => openPanel(w.worker_id, 'reject')}>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {panel && panel.workerId === w.worker_id && (
            <div className="review-panel">
              <label className="review-label">
                {panel.mode === 'redo' ? 'What should the worker fix and resubmit?' : 'Reason for rejection (optional)'}
              </label>
              <textarea
                className="input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={panel.mode === 'redo'
                  ? 'e.g. The ID photo is blurry — please re-upload a clear one.'
                  : 'e.g. Submitted document does not match the profile name.'}
              />
              <div className="row" style={{ marginTop: '0.5rem' }}>
                <button className={panel.mode === 'redo' ? 'btn-primary' : 'btn-danger'} disabled={busy === w.worker_id} onClick={sendBack}>
                  {busy === w.worker_id ? 'Sending…' : panel.mode === 'redo' ? 'Send back to redo' : 'Confirm rejection'}
                </button>
                <button className="btn-secondary" disabled={busy === w.worker_id} onClick={() => { setPanel(null); setNote(''); setErr(''); }}>
                  Cancel
                </button>
              </div>
              <p className="note" style={{ marginTop: '0.5rem' }}>The worker returns to unverified, sees your note, and can resubmit.</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function UsersView({ state }) {
  const [view, setView] = useState('all');
  const roleBadge = (r) => ({ admin: 'badge--primary', worker: 'badge--info', requester: 'badge--neutral' }[r] || 'badge--neutral');
  const all = state.data || [];
  const counts = {
    all: all.length,
    requester: all.filter((u) => u.role === 'requester').length,
    worker: all.filter((u) => u.role === 'worker').length,
  };
  const rows = view === 'all' ? all : all.filter((u) => u.role === view);
  return (
    <>
      <h1>Users</h1>
      <p className="subtitle">Oversight only — admins never post, accept, or pay.</p>
      <div className="subtabs">
        <button type="button" className={`subtab ${view === 'all' ? 'subtab--active' : ''}`} onClick={() => setView('all')}>All ({counts.all})</button>
        <button type="button" className={`subtab ${view === 'requester' ? 'subtab--active' : ''}`} onClick={() => setView('requester')}>Requesters ({counts.requester})</button>
        <button type="button" className={`subtab ${view === 'worker' ? 'subtab--active' : ''}`} onClick={() => setView('worker')}>Workers ({counts.worker})</button>
      </div>
      {state.loading ? <Loading /> : state.error ? <ErrorNote message={state.error} /> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${roleBadge(u.role)}`}>{u.role}</span></td>
                    <td>{u.location || '—'}</td>
                    <td>{String(u.created_at).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function CategoriesView({ state }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');

  async function addCategory(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return;
    try {
      await createCategory({ name: name.trim(), description: description.trim() });
      setName(''); setDescription('');
      state.reload();
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <>
      <h1>Skill categories</h1>
      <p className="subtitle">The service categories workers list skills under.</p>
      <div className="card" style={{ marginTop: '0.75rem' }}>
        {state.loading ? <span className="meta">Loading…</span> : (
          <div className="row">
            {(state.data || []).map((c) => <span className="badge badge--neutral" key={c.category_id}>{c.name}</span>)}
          </div>
        )}
        <div className="divider" />
        <form className="row" onSubmit={addCategory} style={{ width: '100%' }}>
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <input className="input" style={{ flex: 1, minWidth: '160px' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <button className="btn-primary" type="submit">Add</button>
        </form>
        <ErrorNote message={err} />
      </div>
    </>
  );
}
