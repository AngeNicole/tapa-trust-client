import { useState, useEffect } from 'react';
import { getAdminUsers, getCategories, createCategory, updateCategory, deleteCategory, getAllWorkers, getWorker, verifyWorker, rejectWorker } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { Loading, ErrorNote, VerifyBadge, EmptyState, Avatar } from '../../components/shared/ui.jsx';
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
  const [view, setView] = useState('all');
  const [reviewing, setReviewing] = useState(null); // the worker row being reviewed

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
      <p className="subtitle">Review each worker&apos;s profile before you approve, ask them to redo, or reject.</p>
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`subtab ${view === t.key ? 'subtab--active' : ''}`} onClick={() => setView(t.key)}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {loading ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={Icons.check} title={`No ${view === 'all' ? '' : view} workers`} hint="Workers appear here once they submit their identity verification." />
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Availability</th><th>Status</th><th style={{ width: 96 }}></th></tr></thead>
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
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn-secondary" onClick={() => setReviewing(w)}>Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewModal
          worker={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); reload(); }}
        />
      )}
    </>
  );
}

// Opens a worker's full profile so the admin sees what they submitted (skills,
// bio, education, certifications, photo, track record) before deciding.
function ReviewModal({ worker, onClose, onDone }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // view | redo | reject
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    getWorker(worker.worker_id)
      .then((p) => { if (alive) setProfile(p); })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [worker.worker_id]);

  async function approve() {
    setBusy(true); setErr('');
    try { await verifyWorker(worker.worker_id); onDone(); } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function sendBack() {
    if (mode === 'redo' && !note.trim()) { setErr('Tell the worker what to fix before asking them to redo.'); return; }
    setBusy(true); setErr('');
    try { await rejectWorker(worker.worker_id, note.trim()); onDone(); } catch (e) { setErr(e.message); setBusy(false); }
  }

  const skills = (profile?.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const certs = (profile?.certifications || '').split(/[\n;,]/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal review-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? <Loading /> : (
          <>
            <div className="review-id">
              <Avatar name={worker.name} photo={profile?.photo} className="avatar" style={{ width: 52, height: 52, borderRadius: 14, fontSize: '1.1rem' }} />
              <div style={{ minWidth: 0 }}>
                <div className="review-name">{worker.name}</div>
                <div className="row" style={{ gap: '0.5rem', marginTop: 4 }}>
                  <VerifyBadge status={worker.verification} />
                  <span className="meta">{(Number(profile?.rating) || 0).toFixed(1)}★ · {profile?.taskHistory?.length || 0} jobs</span>
                </div>
              </div>
            </div>

            <div className="review-sec">
              <h4>Skills</h4>
              {skills.length ? <div className="review-chips">{skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div> : <p className="meta">None listed.</p>}
            </div>
            <div className="review-sec">
              <h4>About</h4>
              <p>{profile?.bio || <span className="meta">No bio provided.</span>}</p>
            </div>
            <div className="review-sec">
              <h4>Education</h4>
              <p>{profile?.education || <span className="meta">Not provided.</span>}</p>
            </div>
            <div className="review-sec">
              <h4>Certifications</h4>
              {certs.length ? <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{certs.map((c) => <li key={c} className="review-sec-li"><p style={{ display: 'inline' }}>{c}</p></li>)}</ul> : <p className="meta">Not provided.</p>}
            </div>
            <div className="review-sec">
              <h4>Submitted evidence</h4>
              <p className="meta">Simulated ID document on file (Tier-1 mock — no real ID stored).</p>
            </div>

            {err && <div className="form-error" style={{ marginTop: '0.75rem' }}>{err}</div>}

            {mode === 'view' ? (
              <div className="review-actions">
                {worker.verification !== 'verified' && <button className="btn-secondary" disabled={busy} onClick={() => { setErr(''); setMode('redo'); }}>Request redo</button>}
                {worker.verification !== 'rejected' && <button className="btn-danger" disabled={busy} onClick={() => { setErr(''); setMode('reject'); }}>{worker.verification === 'verified' ? 'Revoke' : 'Reject'}</button>}
                {worker.verification !== 'verified' && <button className="btn-primary" disabled={busy} onClick={approve}>{busy ? 'Approving…' : 'Approve'}</button>}
                {worker.verification === 'verified' && <button className="btn-secondary" onClick={onClose}>Close</button>}
              </div>
            ) : (
              <>
                <div style={{ marginTop: '0.75rem' }}>
                  <label className="review-label">{mode === 'redo' ? 'What should the worker fix and resubmit?' : 'Reason for rejection (optional)'}</label>
                  <textarea className="input" rows={3} autoFocus value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={mode === 'redo' ? 'e.g. The ID photo is blurry — please re-upload a clear one.' : 'e.g. Document does not match the profile name.'} style={{ width: '100%' }} />
                </div>
                <div className="review-actions">
                  <button className="btn-secondary" disabled={busy} onClick={() => { setMode('view'); setNote(''); setErr(''); }}>Back</button>
                  <button className={mode === 'redo' ? 'btn-primary' : 'btn-danger'} disabled={busy} onClick={sendBack}>
                    {busy ? 'Sending…' : mode === 'redo' ? 'Send back to redo' : 'Confirm rejection'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
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
  const [view, setView] = useState('all');
  const [menuFor, setMenuFor] = useState(null);
  const [modal, setModal] = useState(null); // { mode:'create'|'edit', cat? }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const all = state.data || [];
  const statusOf = (c) => c.status || 'active';
  const counts = { all: all.length, active: all.filter((c) => statusOf(c) === 'active').length, archived: all.filter((c) => statusOf(c) === 'archived').length };
  const shown = view === 'all' ? all : all.filter((c) => statusOf(c) === view);
  const tabs = [{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'archived', label: 'Archived' }];

  async function run(p) {
    setBusy(true); setErr('');
    try { await p; setModal(null); setMenuFor(null); state.reload(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const archive = (c) => run(updateCategory(c.category_id, { status: statusOf(c) === 'archived' ? 'active' : 'archived' }));
  const remove = (c) => { if (window.confirm(`Delete “${c.name}”? This can't be undone.`)) run(deleteCategory(c.category_id)); };

  return (
    <>
      <h1>Skill categories</h1>
      <p className="subtitle">The service categories workers list skills under.</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="subtabs" style={{ margin: 0 }}>
          {tabs.map((t) => (
            <button key={t.key} type="button" className={`subtab ${view === t.key ? 'subtab--active' : ''}`} onClick={() => setView(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={() => { setErr(''); setModal({ mode: 'create' }); }}>+ New category</button>
      </div>
      <ErrorNote message={state.error || err} />
      {state.loading ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={Icons.briefcase} title={`No ${view === 'all' ? '' : view} categories`} hint="Create a category workers can list their skills under." />
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Description</th><th>Status</th><th style={{ width: 48 }}></th></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.category_id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="meta">{c.description || '—'}</td>
                    <td><span className={`badge ${statusOf(c) === 'archived' ? 'badge--neutral' : 'badge--done'}`}>{statusOf(c) === 'archived' ? 'Archived' : 'Active'}</span></td>
                    <td>
                      <div className="menu-wrap">
                        <button type="button" className="menu-trigger" disabled={busy} aria-label="Actions" onClick={() => setMenuFor(menuFor === c.category_id ? null : c.category_id)}>{Icons.dots}</button>
                        {menuFor === c.category_id && (
                          <>
                            <div className="menu-backdrop" onClick={() => setMenuFor(null)} />
                            <div className="menu-pop">
                              <button type="button" className="menu-item" onClick={() => { setErr(''); setMenuFor(null); setModal({ mode: 'edit', cat: c }); }}>Edit…</button>
                              <button type="button" className="menu-item" onClick={() => archive(c)}>{statusOf(c) === 'archived' ? 'Restore' : 'Archive'}</button>
                              <button type="button" className="menu-item menu-item--danger" onClick={() => remove(c)}>Delete</button>
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
        <CategoryModal
          mode={modal.mode}
          cat={modal.cat}
          busy={busy}
          err={err}
          onClose={() => { setModal(null); setErr(''); }}
          onSave={(payload) => run(modal.mode === 'create' ? createCategory(payload) : updateCategory(modal.cat.category_id, payload))}
        />
      )}
    </>
  );
}

function CategoryModal({ mode, cat, busy, err, onClose, onSave }) {
  const [name, setName] = useState(cat?.name || '');
  const [description, setDescription] = useState(cat?.description || '');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{mode === 'create' ? 'New category' : `Edit ${cat.name}`}</div>
        <label className="field-label" style={{ marginTop: '0.75rem' }}>Name
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plumbing" style={{ width: '100%' }} autoFocus />
        </label>
        <label className="field-label" style={{ marginTop: '0.6rem' }}>Description
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" style={{ width: '100%' }} />
        </label>
        {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
        <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || !name.trim()} onClick={() => onSave({ name: name.trim(), description: description.trim() })}>
            {busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
