import { useState, useEffect } from 'react';
import { getAdminUsers, getCategories, createCategory, updateCategory, deleteCategory, getAllWorkers, getWorker, verifyWorker, rejectWorker, getAdminDisputes, getAdminDispute, ruleDispute, scheduleDisputeMeeting, postDisputeMessage } from '../../api/client.js';
import { useAsync } from '../../api/hooks.js';
import { Loading, ErrorNote, VerifyBadge, EmptyState, Avatar, rwf } from '../../components/shared/ui.jsx';
import { DashShell } from '../../components/DashShell.jsx';
import { Analytics } from '../../components/shared/Analytics.jsx';
import { Icons } from '../../components/shared/icons.jsx';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const users = useAsync(() => getAdminUsers(), []);
  const categories = useAsync(() => getCategories(), []);
  const workers = useAsync(() => getAllWorkers(), []);
  const disputes = useAsync(() => getAdminDisputes(), [], { intervalMs: 8000 });

  const pending = (workers.data || []).filter((w) => w.verification === 'pending').length;
  const openDisputes = (disputes.data || []).filter((d) => d.status === 'open').length;

  const items = [
    { key: 'overview', label: 'Dashboard', icon: Icons.grid || Icons.spark },
    { key: 'verify', label: 'Verifications', icon: Icons.check, count: pending },
    { key: 'disputes', label: 'Disputes', icon: Icons.scales || Icons.warning, count: openDisputes },
    { key: 'users', label: 'Users', icon: Icons.user, count: users.data?.length || 0 },
    { key: 'categories', label: 'Categories', icon: Icons.briefcase, count: categories.data?.length || 0 },
  ];

  return (
    <DashShell items={items} active={tab} onSelect={setTab}>
      {tab === 'overview' && <OverviewView users={users.data || []} workers={workers.data || []} categories={categories.data || []} openDisputes={openDisputes} />}
      {tab === 'verify' && <VerifyView state={workers} />}
      {tab === 'disputes' && <DisputesView state={disputes} />}
      {tab === 'users' && <UsersView state={users} />}
      {tab === 'categories' && <CategoriesView state={categories} />}
    </DashShell>
  );
}

function OverviewView({ users, workers, categories, openDisputes = 0 }) {
  const bucketOf = (w) => (w.verification === 'verified' ? 'approved' : w.verification);
  const engaged = workers.filter((w) => w.verification !== 'unverified');
  const counts = {
    pending: engaged.filter((w) => bucketOf(w) === 'pending').length,
    approved: engaged.filter((w) => bucketOf(w) === 'approved').length,
    rejected: engaged.filter((w) => bucketOf(w) === 'rejected').length,
  };
  const requesters = users.filter((u) => u.role === 'requester').length;
  const workerUsers = users.filter((u) => u.role === 'worker').length;

  // Recent submissions awaiting or through review → activity feed.
  const dotFor = (b) => ({ approved: 'completed', pending: 'pending', rejected: 'cancelled' }[b] || 'pending');
  const activity = [...engaged]
    .sort((a, b) => (b.worker_id || 0) - (a.worker_id || 0))
    .slice(0, 7)
    .map((w) => ({ status: dotFor(bucketOf(w)), label: w.name, sub: `Verification ${bucketOf(w)}` }));

  return (
    <Analytics
      title="Admin dashboard"
      subtitle="Platform health at a glance — oversight only."
      kpis={[
        { icon: Icons.user, value: users.length, label: 'Total users' },
        { icon: Icons.briefcase, value: workerUsers, label: 'Workers' },
        { icon: Icons.user, value: requesters, label: 'Requesters' },
        { icon: Icons.check, value: counts.pending, label: 'Pending review' },
        { icon: Icons.checkCircle, value: counts.approved, label: 'Verified' },
        { icon: Icons.scales || Icons.warning, value: openDisputes, label: 'Open disputes' },
        { icon: Icons.briefcase, value: categories.length, label: 'Categories' },
      ]}
      chart={{
        title: 'Workers by verification',
        data: [
          { label: 'Pending', value: counts.pending },
          { label: 'Approved', value: counts.approved },
          { label: 'Rejected', value: counts.rejected },
        ],
        format: (v) => v,
      }}
      activity={activity}
    />
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
  const certFiles = Array.isArray(profile?.certificationFiles) ? profile.certificationFiles : [];
  const isImg = (s) => typeof s === 'string' && s.startsWith('data:image');
  const vMethod = profile?.verificationMethod;
  const fmScore = profile?.faceMatchScore;
  const fmPassed = profile?.faceMatchPassed;
  // Match-then-discard: identity images never leave the worker's device, so these
  // are normally null and the online panel shows "No images on file" — the admin
  // reviews the match score + certificates. These stay defensively in case a
  // legacy record ever had a value.
  const idDoc = profile?.idDocument;
  const selfieImg = profile?.selfie;

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
              <h4>Identity check</h4>
              <p className="meta">Verification path: <strong>{vMethod === 'online' ? 'Online (on-device face match)' : vMethod === 'physical' ? 'In person' : 'Not specified'}</strong>.</p>
              {vMethod === 'physical' && (
                <p className="meta">Confirm this worker in person (office/agent), then approve — same Verified status as the online path.</p>
              )}
              {vMethod === 'online' && (
                <>
                  {fmScore != null ? (
                    <div className={`facematch-res ${fmPassed ? 'is-match' : 'is-nomatch'}`} style={{ marginTop: '0.4rem' }}>
                      {fmPassed ? Icons.checkCircle : Icons.warning}
                      <span><strong>Face match: {fmScore}%</strong> — {fmPassed ? 'likely the same person' : 'weak match — review closely'}</span>
                    </div>
                  ) : (
                    <p className="meta">The face check wasn&apos;t conclusive — consider confirming in person.</p>
                  )}
                  {(idDoc || selfieImg) ? (
                    <>
                      <p className="meta" style={{ marginTop: '0.5rem' }}>Confirm the ID looks like a genuine document, and that the ID photo and the selfie are the same person. Click to enlarge.</p>
                      <div className="review-certs" style={{ marginTop: '0.4rem' }}>
                        {idDoc && (
                          <a className="review-cert" href={idDoc} target="_blank" rel="noreferrer" title="ID document">
                            {isImg(idDoc) ? <img src={idDoc} alt="ID document" /> : <span className="review-cert-ic">{Icons.idCard}</span>}
                            <span className="review-cert-name">ID document</span>
                          </a>
                        )}
                        {selfieImg && (
                          <a className="review-cert" href={selfieImg} target="_blank" rel="noreferrer" title="Selfie">
                            {isImg(selfieImg) ? <img src={selfieImg} alt="Selfie" /> : <span className="review-cert-ic">{Icons.user}</span>}
                            <span className="review-cert-name">Selfie</span>
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="meta" style={{ marginTop: '0.4rem' }}>No images on file for this submission.</p>
                  )}
                </>
              )}
            </div>
            <div className="review-sec">
              <h4>Certificates</h4>
              {certFiles.length ? (
                <div className="review-certs">
                  {certFiles.map((f, i) => (
                    <a className="review-cert" key={`${f.name}-${i}`} href={f.dataUrl} target="_blank" rel="noreferrer" title={f.name}>
                      {isImg(f.dataUrl) ? <img src={f.dataUrl} alt={f.name} /> : <span className="review-cert-ic">{Icons.certificate}</span>}
                      <span className="review-cert-name">{f.name}</span>
                    </a>
                  ))}
                </div>
              ) : certs.length ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{certs.map((c) => <li key={c} className="review-sec-li"><p style={{ display: 'inline' }}>{c}</p></li>)}</ul>
              ) : <p className="meta">Not provided.</p>}
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

// ── Disputes: queue + neutral admin ruling on captured evidence ──────────
const CAT_LABEL = {
  'duration disagreement': 'Duration', 'work quality': 'Work quality',
  'no-show': 'No-show', 'payment amount': 'Payment amount', other: 'Other',
};
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function DisputesView({ state }) {
  const { data, loading, error, reload } = state;
  const [view, setView] = useState('open');
  const [reviewing, setReviewing] = useState(null);
  const all = data || [];
  const counts = { open: all.filter((d) => d.status === 'open').length, resolved: all.filter((d) => d.status === 'resolved').length, all: all.length };
  const shown = view === 'all' ? all : all.filter((d) => d.status === view);
  const tabs = [{ key: 'open', label: 'Open' }, { key: 'resolved', label: 'Resolved' }, { key: 'all', label: 'All' }];

  return (
    <>
      <h1>Disputes</h1>
      <p className="subtitle">Neutral oversight: rule on the platform-captured record — timeline, agreed price and chat — not he-said-she-said.</p>
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`subtab ${view === t.key ? 'subtab--active' : ''}`} onClick={() => setView(t.key)}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {loading ? <Loading /> : shown.length === 0 ? (
        <EmptyState icon={Icons.scales || Icons.warning} title={`No ${view === 'all' ? '' : view} disputes`} hint="When either party reports an issue on a booking, it appears here with the captured evidence." />
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Booking</th><th>Issue</th><th>Raised by</th><th>Amount</th><th>Status</th><th style={{ width: 96 }}></th></tr></thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.disputeId}>
                    <td>{d.taskTitle}<div className="meta">{d.workerName} ↔ {d.requesterName}</div></td>
                    <td><span className="badge badge--neutral">{CAT_LABEL[d.category] || d.category}</span></td>
                    <td className="meta">{d.raisedBy}</td>
                    <td>{d.agreedPrice != null ? rwf(d.agreedPrice) : '—'}</td>
                    <td><span className={`badge ${d.status === 'open' ? 'badge--progress' : 'badge--done'}`}>{d.status === 'open' ? 'Open' : `Resolved · ${d.outcome}`}</span></td>
                    <td style={{ textAlign: 'right' }}><button type="button" className="btn-secondary" onClick={() => setReviewing(d)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {reviewing && <DisputeDetailModal dispute={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); reload(); }} />}
    </>
  );
}

const MEETING_LABEL = { in_app: 'In-app discussion', google_meet: 'Google Meet', physical: 'Physical meetup' };

function DisputeDetailModal({ dispute, onClose, onDone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Mediation scheduling + thread composer
  const [mode, setMode] = useState('in_app');
  const [meetDetail, setMeetDetail] = useState('');
  const [meetAt, setMeetAt] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try { setDetail(await getAdminDispute(dispute.disputeId)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [dispute.disputeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolved = detail?.status === 'resolved';
  const hasMeeting = Boolean(detail?.meetingMode);

  async function schedule() {
    if ((mode === 'google_meet' || mode === 'physical') && !meetDetail.trim()) {
      setErr(mode === 'google_meet' ? 'Paste the meeting link.' : 'Enter the meetup place/time.'); return;
    }
    setBusy(true); setErr('');
    try { await scheduleDisputeMeeting(dispute.disputeId, { mode, detail: meetDetail, at: meetAt || null }); setRescheduling(false); setMeetDetail(''); setMeetAt(''); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function send() {
    if (!msg.trim()) return;
    setBusy(true); setErr('');
    try { await postDisputeMessage(dispute.disputeId, msg.trim()); setMsg(''); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function rule() {
    if (!outcome) { setErr('Choose an outcome.'); return; }
    setBusy(true); setErr('');
    try { await ruleDispute(dispute.disputeId, { outcome, note }); onDone(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  const ev = detail?.evidence;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal review-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? <Loading /> : (
          <>
            <div className="review-id">
              <span className="avatar" style={{ width: 52, height: 52, borderRadius: 14 }}>{Icons.scales || Icons.warning}</span>
              <div style={{ minWidth: 0 }}>
                <div className="review-name">{ev?.taskTitle}</div>
                <div className="row" style={{ gap: '0.5rem', marginTop: 4 }}>
                  <span className="badge badge--neutral">{CAT_LABEL[detail.category] || detail.category}</span>
                  <span className="meta">Raised by {detail.raisedBy} · {fmtTime(detail.createdAt)}</span>
                </div>
              </div>
            </div>

            {detail.description && (
              <div className="review-sec"><h4>What they reported</h4><p>“{detail.description}”</p></div>
            )}

            <div className="review-sec">
              <h4>Confirmation timeline (platform-captured)</h4>
              <div className="dispute-timeline">
                {ev?.timeline.map((t) => (
                  <div key={t.key} className={`dtl-row ${t.at ? 'is-done' : ''}`}>
                    <span className="dtl-dot" />
                    <span className="dtl-label">{t.label}</span>
                    <span className="dtl-at">{fmtTime(t.at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-sec">
              <h4>Agreed price</h4>
              <p>{ev?.agreedPrice != null ? rwf(ev.agreedPrice) : 'Not set'} · payment currently <strong>{ev?.payment?.status || 'pending'}</strong></p>
            </div>

            <div className="review-sec">
              <h4>Chat thread</h4>
              {ev?.messages?.length ? (
                <div className="dispute-chat">
                  {ev.messages.map((m, i) => (
                    <div key={i} className="dchat-msg">
                      <span className="dchat-who">{m.senderName}</span>
                      <span className="dchat-body">{m.body}{m.amount != null ? ` · offered ${rwf(m.amount)}` : ''}</span>
                      <span className="dchat-at">{fmtTime(m.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="meta">No messages.</p>}
            </div>

            <div className="review-sec">
              <h4>Accountability trail</h4>
              <p className="meta">This worker has been in {detail.history?.workerDisputes ?? 0} dispute(s); this requester in {detail.history?.requesterDisputes ?? 0}.</p>
            </div>

            {/* Mediation — hear both sides before ruling */}
            <div className="review-sec">
              <h4>Mediation</h4>

              {hasMeeting && (
                <>
                  <p className="meta">
                    Current method: <strong>{MEETING_LABEL[detail.meetingMode] || detail.meetingMode}</strong>
                    {detail.meetingAt ? ` · ${fmtTime(detail.meetingAt)}` : ''}
                    {detail.meetingMode === 'google_meet' && detail.meetingDetail ? <> · <a href={detail.meetingDetail} target="_blank" rel="noreferrer">Join link</a></> : null}
                    {detail.meetingMode === 'physical' && detail.meetingDetail ? ` · ${detail.meetingDetail}` : ''}
                  </p>
                  <div className="dispute-chat" style={{ marginTop: '0.5rem' }}>
                    {detail.messages?.length ? detail.messages.map((m, i) => (
                      <div key={i} className="dchat-msg">
                        <span className="dchat-who">{m.senderName} · {m.senderRole}</span>
                        <span className="dchat-body">{m.body}</span>
                        <span className="dchat-at">{fmtTime(m.created_at)}</span>
                      </div>
                    )) : <p className="meta">No messages yet — both parties can post here.</p>}
                  </div>
                  {!resolved && (
                    <div className="row" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add a note to the discussion…" style={{ flex: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} />
                      <button className="btn-secondary" onClick={send} disabled={busy || !msg.trim()}>Send</button>
                    </div>
                  )}
                  {!resolved && !rescheduling && (
                    <button type="button" className="btn-ghost" style={{ marginTop: '0.5rem' }}
                      onClick={() => { setRescheduling(true); setMode(detail.meetingMode); setMeetDetail(detail.meetingDetail || ''); setErr(''); }}>
                      {Icons.scales} This method isn’t working? Propose a different one
                    </button>
                  )}
                </>
              )}

              {!resolved && (!hasMeeting || rescheduling) && (
                <div style={{ marginTop: hasMeeting ? '0.5rem' : 0 }}>
                  <p className="meta" style={{ marginBottom: '0.5rem' }}>
                    {hasMeeting ? 'Propose a different way to meet — the parties are notified.' : 'Set up a meeting to hear both parties, in the mode they’re comfortable with.'}
                  </p>
                  <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[{ v: 'in_app', l: 'In-app discussion' }, { v: 'google_meet', l: 'Google Meet' }, { v: 'physical', l: 'Physical meetup' }].map((o) => (
                      <button key={o.v} type="button" className={mode === o.v ? 'chip' : 'chip-opt'} onClick={() => setMode(o.v)}>{o.l}</button>
                    ))}
                  </div>
                  {mode !== 'in_app' && (
                    <input className="input" value={meetDetail} onChange={(e) => setMeetDetail(e.target.value)} style={{ width: '100%', marginTop: '0.5rem' }}
                      placeholder={mode === 'google_meet' ? 'Paste the Google Meet link' : 'Place & time (e.g. TaPa office, Fri 2pm)'} />
                  )}
                  <input className="input" type="datetime-local" value={meetAt} onChange={(e) => setMeetAt(e.target.value)} style={{ width: '100%', marginTop: '0.5rem' }} />
                  <div className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button className="btn-primary" onClick={schedule} disabled={busy}>{busy ? 'Saving…' : hasMeeting ? 'Update meeting' : 'Schedule meeting'}</button>
                    {rescheduling && <button className="btn-secondary" onClick={() => { setRescheduling(false); setErr(''); }} disabled={busy}>Cancel</button>}
                  </div>
                </div>
              )}
            </div>

            {err && <div className="form-error" style={{ marginTop: '0.75rem' }}>{err}</div>}

            {resolved ? (
              <div className="review-sec"><h4>Ruling</h4><p>Outcome: <strong>{detail.outcome}</strong>{detail.ruling ? ` — “${detail.ruling}”` : ''}</p></div>
            ) : (
              <>
                <div className="review-sec">
                  <h4>Ruling (neutral oversight)</h4>
                  {!hasMeeting ? (
                    <p className="meta">Schedule a mediation meeting and hear both parties before recording a ruling.</p>
                  ) : (
                    <>
                      <p className="meta" style={{ marginBottom: '0.5rem' }}>A no-prior-relationship handler gives fairer outcomes. Decide based on the record and the meeting.</p>
                      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[{ v: 'release', l: 'Release to worker' }, { v: 'refund', l: 'Refund requester' }, { v: 'dismiss', l: 'Dismiss (no change)' }].map((o) => (
                          <button key={o.v} type="button" className={outcome === o.v ? 'chip' : 'chip-opt'} onClick={() => setOutcome(o.v)}>{o.l}</button>
                        ))}
                      </div>
                      <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ruling note (optional)" style={{ width: '100%', marginTop: '0.6rem' }} />
                    </>
                  )}
                </div>
                <div className="review-actions">
                  <button className="btn-secondary" onClick={onClose} disabled={busy}>Close</button>
                  <button className="btn-primary" onClick={rule} disabled={busy || !outcome || !hasMeeting}>{busy ? 'Recording…' : 'Record ruling'}</button>
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
