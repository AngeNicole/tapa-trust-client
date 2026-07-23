import { useState } from 'react';
import { useAsync } from '../../api/hooks.js';
import { browseJobs, getMyJobInterests, expressJobInterest } from '../../api/client.js';
import { Loading, ErrorNote, EmptyState, rwf } from '../shared/ui.jsx';
import { Icons } from '../shared/icons.jsx';
import { JobChatModal } from '../JobChatModal.jsx';

// Worker "Browse jobs" — see open posts, express interest with a message (which
// opens a conversation with the requester), and continue those chats under
// "My responses". Only verified workers can respond (enforced server-side).
export function WorkerJobs() {
  const [sub, setSub] = useState('browse');
  const [term, setTerm] = useState('');
  const [skill, setSkill] = useState('');
  const jobs = useAsync(() => browseJobs(skill), [skill]);
  const mine = useAsync(() => getMyJobInterests(), []);
  const [interestFor, setInterestFor] = useState(null); // job we're introducing ourselves to
  const [chat, setChat] = useState(null);               // { interestId, title }

  const refreshMine = () => mine.reload();

  return (
    <>
      <h1>Browse jobs</h1>
      <p className="subtitle">Find posted jobs and message the requester — they book you from your profile.</p>

      <div className="subtabs" style={{ marginBottom: '1rem' }}>
        {[{ k: 'browse', l: 'Open jobs' }, { k: 'mine', l: `My responses${(mine.data || []).length ? ` (${mine.data.length})` : ''}` }].map((t) => (
          <button key={t.k} type="button" className={`subtab ${sub === t.k ? 'subtab--active' : ''}`} onClick={() => setSub(t.k)}>{t.l}</button>
        ))}
      </div>

      {sub === 'browse' ? (
        <>
          <form className="row" onSubmit={(e) => { e.preventDefault(); setSkill(term.trim()); }} style={{ marginBottom: '0.75rem' }}>
            <input className="input" style={{ flex: 1, minWidth: '180px' }} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Filter by trade, e.g. Plumbing" />
            <button className="btn-primary" type="submit">Search</button>
            {skill && <button type="button" className="btn-secondary" onClick={() => { setTerm(''); setSkill(''); }}>Clear</button>}
          </form>
          {jobs.loading ? <Loading /> : jobs.error ? <ErrorNote message={jobs.error} /> : (jobs.data || []).length === 0 ? (
            <EmptyState icon={Icons.briefcase} title={skill ? `No open jobs for “${skill}”` : 'No open jobs right now'} hint="Check back soon — requesters post new jobs regularly." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(jobs.data || []).map((j) => {
                const meta = [j.category, j.budget != null ? rwf(j.budget) : null, j.location].filter(Boolean).join(' · ');
                return (
                  <div className="card" key={j.job_id}>
                    <div className="card-head"><div className="card-title">{j.title}</div><span className="meta">by {j.requesterName}</span></div>
                    {meta && <p className="meta" style={{ marginTop: '0.15rem' }}>{meta}</p>}
                    {j.description && <p style={{ marginTop: '0.35rem' }}>{j.description}</p>}
                    <div className="row" style={{ marginTop: '0.6rem' }}>
                      <button type="button" className="btn-primary" onClick={() => setInterestFor(j)}>{Icons.chat} I&apos;m interested</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        mine.loading ? <Loading /> : (mine.data || []).length === 0 ? (
          <EmptyState icon={Icons.chat} title="No responses yet" hint="Express interest in an open job to start a conversation." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(mine.data || []).map((r) => (
              <button type="button" className="convo" key={r.interestId} style={{ border: '1px solid var(--color-stroke-soft-200)', borderRadius: 12 }}
                onClick={() => setChat({ interestId: r.interestId, title: r.title })}>
                <span className="convo-open">{Icons.chat}</span>
                <div className="convo-info">
                  <div className="convo-top"><span className="convo-name">{r.title}</span><span className={`badge ${r.status === 'open' ? 'badge--info' : 'badge--neutral'}`}>{r.status === 'open' ? 'Open' : 'Closed'}</span></div>
                  <div className="convo-sub">{r.requesterName}{r.lastMessage ? ` · ${r.lastMessage}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {interestFor && (
        <InterestModal
          job={interestFor}
          onClose={() => setInterestFor(null)}
          onSent={(interestId) => { setInterestFor(null); refreshMine(); setChat({ interestId, title: interestFor.title }); }}
        />
      )}
      {chat && <JobChatModal interestId={chat.interestId} title={chat.title} onClose={() => setChat(null)} />}
    </>
  );
}

function InterestModal({ job, onClose, onSent }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function send() {
    if (!msg.trim()) { setErr('Add a short message to introduce yourself.'); return; }
    setBusy(true); setErr('');
    try { const { interestId } = await expressJobInterest(job.job_id, msg.trim()); onSent(interestId); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Respond to “{job.title}”</div>
        <p className="meta" style={{ marginTop: '0.25rem' }}>Introduce yourself and say why you&apos;re a good fit. The requester can then message you and book you.</p>
        <textarea className="textarea" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hi, I can help with this — I've done similar jobs…" style={{ width: '100%', marginTop: '0.5rem' }} autoFocus />
        {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-primary" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send & open chat'}</button>
        </div>
      </div>
    </div>
  );
}
