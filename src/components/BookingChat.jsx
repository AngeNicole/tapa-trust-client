import { useState, useEffect, useRef, useCallback } from 'react';
import { getBookingMessages, sendBookingMessage, agreeBookingPrice } from '../api/client.js';
import { rwf } from './shared/ui.jsx';

// Chat + price agreement on a booking. Both participants (requester and worker)
// exchange messages, propose prices, and either can accept an amount — which
// sets the booking's agreed price. Presentational + calls the booking API.
export default function BookingChat({ booking, me, onClose, onAgreed }) {
  const [messages, setMessages] = useState([]);
  const [agreed, setAgreed] = useState(booking.agreedPrice ?? null);
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const threadRef = useRef(null);
  const myId = me?.user_id;
  const otherName = me?.role === 'worker' ? booking.requesterName : booking.workerName;

  const load = useCallback(async () => {
    try {
      const data = await getBookingMessages(booking.booking_id);
      setMessages(data.messages || []);
      setAgreed(data.agreedPrice ?? null);
    } catch (e) { setErr(e.message); }
  }, [booking.booking_id]);

  // Load on open, then poll so the other party's messages appear live.
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  async function send(payload) {
    setErr(''); setBusy(true);
    try { await sendBookingMessage(booking.booking_id, payload); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function sendText(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text; setText('');
    await send({ body });
  }
  async function sendOffer(e) {
    e.preventDefault();
    const n = Number(offer);
    if (!Number.isFinite(n) || n <= 0) { setErr('Enter a price greater than zero.'); return; }
    setOffer('');
    await send({ amount: n });
  }
  async function accept(amount) {
    setErr(''); setBusy(true);
    try { const b = await agreeBookingPrice(booking.booking_id, amount); setAgreed(b.agreedPrice ?? amount); await load(); onAgreed?.(b); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-head">
          <div>
            <div className="modal-title" style={{ marginBottom: 2 }}>Chat &amp; agree price</div>
            <div className="meta">{booking.taskTitle} · with {otherName}</div>
          </div>
          <button className="btn-mini" onClick={onClose}>Close</button>
        </div>

        <div className={`chat-agreed ${agreed != null ? 'is-set' : ''}`}>
          {agreed != null ? <>✓ Agreed price: <strong>{rwf(agreed)}</strong></> : 'No price agreed yet — propose one below.'}
        </div>

        <div className="chat-thread" ref={threadRef}>
          {messages.length === 0 ? (
            <div className="meta" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              Say hello and agree on a price for the job.
            </div>
          ) : messages.map((m) => {
            const mine = m.senderUserId === myId;
            const isProposal = m.amount != null;
            const canAccept = isProposal && !mine && Number(m.amount) !== Number(agreed);
            return (
              <div key={m.message_id} className={`chat-msg ${mine ? 'chat-msg--me' : ''}`}>
                <div className="chat-bubble">
                  {!mine && <div className="chat-who">{m.senderName}</div>}
                  {m.body && <div>{m.body}</div>}
                  {isProposal && (
                    <div className="chat-price">
                      <span>{rwf(m.amount)}</span>
                      {canAccept && <button className="btn-mini" disabled={busy} onClick={() => accept(Number(m.amount))}>Accept</button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {err && <div className="form-error" style={{ margin: '0 0 0.5rem' }}>{err}</div>}

        <form className="chat-offer" onSubmit={sendOffer}>
          <span className="chat-offer-label">RWF</span>
          <input type="number" min="1" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Propose a price" />
          <button className="btn-secondary" type="submit" disabled={busy}>Send offer</button>
        </form>

        <form className="chat-composer" onSubmit={sendText}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${otherName}…`} />
          <button className="btn-primary" type="submit" disabled={busy || !text.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}
