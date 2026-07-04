import { useState, useEffect, useRef, useCallback } from 'react';
import { getBookingMessages, sendBookingMessage, agreeBookingPrice } from '../api/client.js';
import { rwf, Avatar } from './shared/ui.jsx';
import { Icons } from './shared/icons.jsx';

// Right-side chat drawer (Instagram-style) for a booking: back-and-forth
// messages, price offers either party can Accept / Counter / Decline, a Call
// button, and temporary location sharing once a price is agreed.
//
// Decline and location are encoded as message-body markers (no extra backend
// needed) so both participants render them identically.
const LOC = '__loc__ ';       // "__loc__ lat,lng"
const DEC = '__decline__ ';   // "__decline__ amount"
const parseLoc = (b) => (b && b.startsWith(LOC) ? b.slice(LOC.length).trim() : null);
const parseDecline = (b) => (b && b.startsWith(DEC) ? (Number(b.slice(DEC.length).trim()) || 0) : null);

function timeLabel(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function BookingChat({ booking, me, onClose, onAgreed }) {
  const [messages, setMessages] = useState([]);
  const [agreed, setAgreed] = useState(booking.agreedPrice ?? null);
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const threadRef = useRef(null);
  const offerRef = useRef(null);
  const myId = me?.user_id;
  const iAmWorker = me?.role === 'worker';
  const otherName = iAmWorker ? booking.requesterName : booking.workerName;
  const otherPhone = iAmWorker ? booking.requesterPhone : booking.workerPhone;
  const jobDone = ['completed', 'cancelled'].includes(booking.status);

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
    const t = setInterval(load, 4000);
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
  const decline = (amount) => send({ body: `${DEC}${Math.round(amount)}` });
  function counter(amount) {
    setOffer(String(Math.round(amount)));
    offerRef.current?.focus();
  }
  function shareLocation() {
    setErr('');
    if (!navigator.geolocation) { setErr('Location is not available on this device.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { send({ body: `${LOC}${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}` }); },
      () => { setErr('Could not get your location — check permissions.'); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="chat-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Booking chat">
        <header className="chat-dhead">
          <Avatar name={otherName} className="avatar" style={{ width: 40, height: 40, borderRadius: 999, fontSize: '0.85rem' }} />
          <div className="chat-dhead-info">
            <div className="chat-dhead-name">{otherName}</div>
            <div className="chat-dhead-sub">{booking.taskTitle}</div>
          </div>
          <a
            className={`chat-icon-btn ${otherPhone ? '' : 'is-disabled'}`}
            href={otherPhone ? `tel:${otherPhone}` : undefined}
            title={otherPhone ? `Call ${otherName}` : 'No phone number on file'}
            aria-disabled={!otherPhone}
            onClick={(e) => { if (!otherPhone) e.preventDefault(); }}
          >
            {Icons.phone}
          </a>
          <button className="chat-icon-btn" onClick={onClose} title="Close" aria-label="Close chat">{Icons.close}</button>
        </header>

        <div className={`chat-agreed ${agreed != null ? 'is-set' : ''}`}>
          {agreed != null ? <>✓ Agreed price: <strong>{rwf(agreed)}</strong></> : 'Negotiate and agree on a price for this job.'}
        </div>

        {agreed != null && !jobDone && (
          <button className="chat-share" onClick={shareLocation} disabled={busy}>
            {Icons.pin} Share my location <span>· temporary, until the job is done</span>
          </button>
        )}

        <div className="chat-thread" ref={threadRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">{Icons.chat}<span>Say hello and agree on a price.</span></div>
          ) : messages.map((m) => {
            const mine = m.senderUserId === myId;
            const loc = parseLoc(m.body);
            const declinedAmt = parseDecline(m.body);
            const isProposal = m.amount != null && !loc && declinedAmt == null;
            const isAgreed = isProposal && Number(m.amount) === Number(agreed);
            const canAct = isProposal && !mine && !isAgreed && !jobDone;
            return (
              <div key={m.message_id} className={`chat-msg ${mine ? 'chat-msg--me' : ''}`}>
                <div className="chat-bubble">
                  {!mine && <div className="chat-who">{m.senderName}</div>}

                  {declinedAmt != null ? (
                    <div className="chat-decline">{Icons.close}<span>Offer declined{declinedAmt ? ` — ${rwf(declinedAmt)}` : ''}</span></div>
                  ) : loc ? (
                    <a className="chat-loc" href={`https://www.google.com/maps?q=${loc}`} target="_blank" rel="noreferrer">
                      <span className="chat-loc-ic">{Icons.pin}</span>
                      <span>
                        <span className="chat-loc-t">{mine ? 'You shared a location' : 'Shared a location'}</span>
                        <span className="chat-loc-s">{jobDone ? 'Sharing ended' : 'Tap to view on map · temporary'}</span>
                      </span>
                    </a>
                  ) : (
                    <>
                      {m.body && <div className="chat-body">{m.body}</div>}
                      {isProposal && (
                        <div className="chat-offer-chip">
                          <span className="chat-offer-amt">{rwf(m.amount)}</span>
                          {isAgreed && <span className="chat-accepted">✓ Accepted</span>}
                          {canAct && (
                            <span className="chat-offer-acts">
                              <button className="chat-mini-btn is-accept" disabled={busy} onClick={() => accept(Number(m.amount))}>Accept</button>
                              <button className="chat-mini-btn" disabled={busy} onClick={() => counter(Number(m.amount))}>Counter</button>
                              <button className="chat-mini-btn is-decline" disabled={busy} onClick={() => decline(Number(m.amount))}>Decline</button>
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div className="chat-time">{timeLabel(m.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {err && <div className="form-error" style={{ margin: '0 1rem' }}>{err}</div>}

        {!jobDone && (
          <form className="chat-offer" onSubmit={sendOffer}>
            <span className="chat-offer-label">RWF</span>
            <input ref={offerRef} type="number" min="1" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Propose / counter a price" />
            <button className="btn-secondary" type="submit" disabled={busy}>Send offer</button>
          </form>
        )}

        <form className="chat-composer" onSubmit={sendText}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${otherName}…`} />
          <button className="chat-send" type="submit" disabled={busy || !text.trim()} aria-label="Send">{Icons.send}</button>
        </form>
      </aside>
    </div>
  );
}
