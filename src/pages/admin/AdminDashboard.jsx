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
  const [view, setView] = useState('all');
  const [menuFor, setMenuFor] = useState(null);          // worker_id whose ⋯ menu is open
  const [modal, setModal] = useState(null);              // { workerId, name, mode: 'redo'|'reject' }
  const [note, setNote] = useState('');

  async function approve(workerId) {
    setErr(''); setBusy(workerId); setMenuFor(null);
    try { await verifyWorker(workerId); reload(); } catch (e) { setErr(e.message); } finally { setBusy(null); }
  }
  function openModal(w, mode) { setErr(''); setNote(''); setMenuFor(null); setModal({ workerId: w.worker_id, name: w.name, mode }); }
  async function submitModal() {
    if (!modal) return;
    if (modal.mode === 'redo' && !note.trim()) { setErr('Tell the worker what to fix before asking them to redo.'); return; }
    setErr(''); setBusy(modal.workerId);
    try { await rejectWorker(modal.workerId, note.trim()); setModal(null); setNote(''); reload(); }
    catch (e) { setErr(e.message); } finally { setBusy(null); }
  }

  // Only real, engaged workers: those with a verification record. Never-submitted
  // (unverified) accounts — the test/dummy noise — are hidden entirely.
  const workers = (data || []).filter((w) => w.verification !== 'unverified');
  const bucket = (w) => (w.verification === 'verified' ? 'approved' : w.verification); // pending | approved | rejected
  const counts = {
    all: workers.length,
    pending: workers.filter((w) => bucket(w) === 'pending').length,
    approved: workers.filter((w) => bucket(w) === 'approved').length,
    rejected: workers.filter((w) => bucket(w) === 'rejected').length,
  };
  const order = { pending: 0, rejected: 1, verified: 2 };
  const shown = (view === 'all' ? workers : workers.filter((w) => bucket(w) === view))
    .slice().sort((a, b) => (order[a.verification] ?? 3) - (order[b.verification] ?? 3));

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <>
      <h1>Verifications</h1>
      <p className="subtitle">Review workers&apos; simulated identity verification — approve, ask them to redo, or reject.</p>
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`subtab ${view === t.key ? 'subtab--active' : ''}`} onClick={() => setView(t.key)}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>
      <ErrorNote message={error || err} />
      {loading ? <Loading /> : shown.length === 0 ? (
        <div className="empty" style={{ marginTop: '0.75rem' }}>No {view === 'all' ? '' : view} workers.</div>
      ) : (
        <div className="card" style={{ overflow: 'visible' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Availability</th><th>Status</th><th style={{ width: 48 }}></th></tr></thead>
              <tbody>
                {shown.map((w) => (
                  <tr key={w.worker_id}>
                    <td>{w.name}</td>
                    <td>
                      <span className={`badge ${w.is_available ? 'badge--done' : 'badge--neutral'}`}>
                        {w.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td><VerifyBadge status={w.verification} /></td>
                    <td>
                      <div className="menu-wrap">
                        <button
                          type="button"
                          className="menu-trigger"
                          disabled={busy === w.worker_id}
                          aria-label="Actions"
                          onClick={() => setMenuFor(menuFor === w.worker_id ? null : w.worker_id)}
                        >
                          {Icons.dots}
                        </button>
                        {menuFor === w.worker_id && (
                          <>
                            <div className="menu-backdrop" onClick={() => setMenuFor(null)} />
                            <div className="menu-pop">
                              {w.verification !== 'verified' && (
                                <button type="button" className="menu-item" onClick={() => approve(w.worker_id)}>Approve</button>
                              )}
                              {w.verification !== 'verified' && (
                                <button type="button" className="menu-item" onClick={() => openModal(w, 'redo')}>Request redo…</button>
                              )}
                              {w.verification !== 'rejected' && (
                                <button type="button" className="menu-item menu-item--danger" onClick={() => openModal(w, 'reject')}>
                                  {w.verification === 'verified' ? 'Revoke / reject…' : 'Reject…'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modal.mode === 'redo' ? `Ask ${modal.name} to redo` : `Reject ${modal.name}`}</div>
            <p className="meta" style={{ margin: '0.25rem 0 0.75rem' }}>
              {modal.mode === 'redo' ? 'Explain what is missing so they can fix it and resubmit.' : 'Optionally add a reason. The worker returns to unverified and can resubmit.'}
            </p>
            <textarea
              className="input" rows={4} autoFocus value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={modal.mode === 'redo' ? 'e.g. The ID photo is blurry — please re-upload a clear one.' : 'e.g. Document does not match the profile name.'}
            />
            {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
            <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className={modal.mode === 'redo' ? 'btn-primary' : 'btn-danger'} disabled={busy === modal.workerId} onClick={submitModal}>
                {busy === modal.workerId ? 'Sending…' : modal.mode === 'redo' ? 'Send back to redo' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
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
