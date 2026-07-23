import { useState } from 'react';
import { useAsync } from '../../api/hooks.js';
import {
  getMyJobs, createJob, closeJob, getCategories, getJobInterests, bookWorker,
} from '../../api/client.js';
import { Avatar, Loading, ErrorNote, EmptyState, rwf, Stars, StatusBadge } from '../shared/ui.jsx';
import { Icons } from '../shared/icons.jsx';
import { useToast } from '../Toast.jsx';
import { JobChatModal } from '../JobChatModal.jsx';

// Requester "Jobs" — post a job, then manage posts and the workers who respond:
// read each interested worker, chat, and book one (which enters the normal
// booking/escrow trust loop).
export function RequesterJobs({ onBooked }) {
  const notify = useToast();
  const jobs = useAsync(() => getMyJobs(), []);
  const cats = useAsync(() => getCategories(), []);
  const [form, setForm] = useState({ title: '', description: '', category: '', budget: '', location: '' });
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState('');
  const [openJob, setOpenJob] = useState(null);   // job whose interests are expanded
  const [chat, setChat] = useState(null);          // { interestId, title }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Give your job a title.'); return; }
    setPosting(true); setErr('');
    try {
      await createJob({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category || null,
        budget: form.budget ? Number(form.budget) : null,
        location: form.location.trim() || null,
      });
      setForm({ title: '', description: '', category: '', budget: '', location: '' });
      notify('Job posted — workers can now find it and respond.');
      jobs.reload();
    } catch (e2) { setErr(e2.message); } finally { setPosting(false); }
  }

  const list = jobs.data || [];
  return (
    <>
      <h1>Post a job</h1>
      <p className="subtitle">Describe what you need. Verified workers can browse it and message you — then you book one.</p>

      <form className="card form" onSubmit={submit} style={{ marginTop: '0.75rem' }}>
        <label>Job title
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Fix a leaking kitchen sink" />
        </label>
        <label>Description
          <textarea className="textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What needs doing, any details, timing…" />
        </label>
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 180px' }}>Category
            <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)} style={{ width: '100%' }}>
              <option value="">Any</option>
              {(cats.data || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 140px' }}>Budget (RWF, optional)
            <input className="input" type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="e.g. 15000" />
          </label>
          <label style={{ flex: '1 1 160px' }}>Location (optional)
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kimironko" />
          </label>
        </div>
        <ErrorNote message={err} />
        <button className="btn-primary" type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post job'}</button>
      </form>

      <h2 style={{ marginTop: '1.5rem' }}>My jobs</h2>
      {jobs.loading ? <Loading /> : jobs.error ? <ErrorNote message={jobs.error} /> : list.length === 0 ? (
        <EmptyState icon={Icons.briefcase} title="No jobs posted yet" hint="Post a job above and interested workers will show up here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          {list.map((j) => (
            <JobRow
              key={j.job_id}
              job={j}
              expanded={openJob === j.job_id}
              onToggle={() => setOpenJob(openJob === j.job_id ? null : j.job_id)}
              onClose={async () => { await closeJob(j.job_id); notify('Job closed.'); jobs.reload(); }}
              onChat={(interestId, name) => setChat({ interestId, title: `Chat with ${name}` })}
              onBook={async (workerId) => {
                try { await bookWorker(workerId); onBooked?.(); }
                catch (e) { notify(e.status === 409 ? 'You already have an active booking with this worker.' : e.message); }
              }}
            />
          ))}
        </div>
      )}

      {chat && <JobChatModal interestId={chat.interestId} title={chat.title} onClose={() => setChat(null)} />}
    </>
  );
}

function JobRow({ job, expanded, onToggle, onClose, onChat, onBook }) {
  const interests = useAsync(() => (expanded ? getJobInterests(job.job_id) : Promise.resolve(null)), [expanded, job.job_id]);
  const meta = [job.category, job.budget != null ? rwf(job.budget) : null, job.location].filter(Boolean).join(' · ');
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{job.title}</div>
        <span className={`badge ${job.status === 'open' ? 'badge--info' : 'badge--neutral'}`}>{job.status === 'open' ? 'Open' : 'Closed'}</span>
      </div>
      {meta && <p className="meta" style={{ marginTop: '0.15rem' }}>{meta}</p>}
      {job.description && <p style={{ marginTop: '0.35rem' }}>{job.description}</p>}
      <div className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
        <button type="button" className="btn-secondary" onClick={onToggle}>
          {Icons.user} {job.interestCount || 0} interested{expanded ? ' ▾' : ' ▸'}
        </button>
        {job.status === 'open' && <button type="button" className="btn-secondary" onClick={onClose}>Close job</button>}
      </div>

      {expanded && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-stroke-soft-200)', paddingTop: '0.75rem' }}>
          {interests.loading ? <Loading /> : (interests.data || []).length === 0 ? (
            <p className="meta">No workers have responded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(interests.data || []).map((w) => (
                <div className="convo" key={w.interestId} style={{ border: '1px solid var(--color-stroke-soft-200)', borderRadius: 12 }}>
                  <Avatar name={w.name} photo={w.photo} className="avatar" style={{ width: 44, height: 44, borderRadius: 999 }} />
                  <div className="convo-info">
                    <div className="convo-top"><span className="convo-name">{w.name}</span><Stars rating={Number(w.rating) || 0} /></div>
                    <div className="convo-sub">{w.lastMessage || w.skills || '—'}</div>
                  </div>
                  <div className="row" style={{ gap: '0.4rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => onChat(w.interestId, w.name)}>{Icons.chat} Chat</button>
                    <button type="button" className="btn-primary" onClick={() => onBook(w.workerId)}>Book</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
