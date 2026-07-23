import { useState, useEffect } from 'react';
import { getJobInterestMessages, postJobInterestMessage } from '../api/client.js';

const fmtT = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

// Conversation about a posted job, between the requester and an interested worker.
// Same look as the dispute mediation thread (reuses .dispute-chat / .dchat-*).
export function JobChatModal({ interestId, title, onClose }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try { setMessages(await getJobInterestMessages(interestId)); } catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [interestId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!msg.trim()) return;
    setBusy(true); setErr('');
    try { await postJobInterestMessage(interestId, msg.trim()); setMsg(''); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title || 'Job conversation'}</div>
        <div className="dispute-chat" style={{ marginTop: '0.75rem' }}>
          {messages.length ? messages.map((x) => (
            <div key={x.message_id} className="dchat-msg">
              <span className="dchat-who">{x.senderName} · {x.senderRole}</span>
              <span className="dchat-body">{x.body}</span>
              <span className="dchat-at">{fmtT(x.created_at)}</span>
            </div>
          )) : <p className="meta">No messages yet.</p>}
        </div>
        {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
          <input
            className="input"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message…"
            style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
          />
          <button className="btn-primary" onClick={send} disabled={busy || !msg.trim()}>Send</button>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
