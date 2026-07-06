import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getBookingMessages, sendBookingMessage, agreeBookingPrice,
  finalizeAgreement, signAgreement, depositEscrow, declineBooking,
} from '../api/client.js';
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
  // Live booking (agreement/escrow/status change as the deal progresses).
  const [bk, setBk] = useState(booking);
  useEffect(() => setBk(booking), [booking]);
  const [signModal, setSignModal] = useState(null); // 'finalize' | 'sign' | null
  const [declineOpen, setDeclineOpen] = useState(false);
  const [sigName, setSigName] = useState(me?.name || '');
  const [sigPrice, setSigPrice] = useState('');
  const [reason, setReason] = useState('');
  const threadRef = useRef(null);
  const offerRef = useRef(null);
  const myId = me?.user_id;
  const iAmWorker = me?.role === 'worker';
  const otherName = iAmWorker ? bk.requesterName : bk.workerName;
  const otherPhone = iAmWorker ? bk.requesterPhone : bk.workerPhone;
  const jobDone = ['completed', 'cancelled'].includes(bk.status);
  // Agreement/escrow UI only appears once the backend returns these fields.
  const ag = bk.agreement;
  const escrow = bk.escrow;
  const dealEnabled = bk && ('agreement' in bk || 'escrow' in bk);

  function refresh(updated) { if (updated) { setBk(updated); onAgreed?.(updated); } }
  async function doFinalize() {
    const n = Number(sigPrice);
    if (!Number.isFinite(n) || n <= 0) { setErr('Enter the agreed price.'); return; }
    if (!sigName.trim()) { setErr('Type your full name to sign.'); return; }
    setBusy(true); setErr('');
    try { refresh(await finalizeAgreement(bk.booking_id, { amount: n, signature: sigName.trim() })); setSignModal(null); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doSign() {
    if (!sigName.trim()) { setErr('Type your full name to sign.'); return; }
    setBusy(true); setErr('');
    try { refresh(await signAgreement(bk.booking_id, sigName.trim())); setSignModal(null); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doDeposit() {
    setBusy(true); setErr('');
    try { refresh(await depositEscrow(bk.booking_id)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doDecline() {
    setBusy(true); setErr('');
    try { refresh(await declineBooking(bk.booking_id, reason.trim())); setDeclineOpen(false); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const load = useCallback(async () => {
    // Background poll — stay silent on transient failures (don't flash an error
    // on the other party's screen while they're just reading the thread).
    try {
      const data = await getBookingMessages(booking.booking_id);
      setMessages(data.messages || []);
      setAgreed(data.agreedPrice ?? null);
    } catch { /* ignore transient poll errors */ }
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
  // One composer: a message is always required; attach a price to make it an offer.
  async function sendCombined(e) {
    e.preventDefault();
    if (!text.trim()) { setErr('Type a message.'); return; }
    const hasPrice = offer !== '' && offer != null;
    const n = hasPrice ? Number(offer) : null;
    if (hasPrice && (!Number.isFinite(n) || n <= 0)) { setErr('Enter a valid price, or leave it empty.'); return; }
    const body = text.trim();
    setText(''); setOffer('');
    await send({ body, amount: n });
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

        {dealEnabled && !jobDone && (
          <div className="chat-agreement">
            {!ag && agreed != null && !iAmWorker && (
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSigPrice(String(agreed || '')); setSigName(me?.name || ''); setErr(''); setSignModal('finalize'); }}>
                {Icons.checkCircle} Finalize agreement
              </button>
            )}
            {!ag && agreed != null && iAmWorker && <span className="meta">Waiting for the requester to finalize the agreement.</span>}
            {!ag && agreed == null && <span className="meta">Agree a price, then finalize the agreement here.</span>}

            {ag && (
              <div className="chat-ag-card">
                <div className="chat-ag-row"><span>Agreement</span><b>{rwf(ag.agreedPrice)}</b></div>
                <div className="chat-ag-sigs">
                  <span className={ag.requesterSigned ? 'is-signed' : ''}>{ag.requesterSigned ? '✓' : '○'} Requester{ag.requesterSignature ? ` · ${ag.requesterSignature}` : ''}</span>
                  <span className={ag.workerSigned ? 'is-signed' : ''}>{ag.workerSigned ? '✓' : '○'} Worker{ag.workerSignature ? ` · ${ag.workerSignature}` : ''}</span>
                </div>
                {ag.status === 'proposed' && iAmWorker && !ag.workerSigned && (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSigName(me?.name || ''); setErr(''); setSignModal('sign'); }}>Review &amp; sign</button>
                )}
                {ag.status === 'proposed' && !iAmWorker && <span className="meta">Waiting for the worker to sign.</span>}
                {ag.status === 'signed' && escrow?.status === 'held' && <span className="chat-escrow is-held">✓ Deposit held in escrow · {rwf(escrow.amount)}</span>}
                {ag.status === 'signed' && escrow?.status === 'released' && <span className="chat-escrow is-released">✓ Payment released · {rwf(escrow.amount)}</span>}
                {ag.status === 'signed' && escrow?.status !== 'held' && escrow?.status !== 'released' && !iAmWorker && (
                  <button className="btn-primary" style={{ width: '100%' }} onClick={doDeposit} disabled={busy}>{busy ? 'Depositing…' : `Deposit ${rwf(ag.agreedPrice)} to escrow`}</button>
                )}
                {ag.status === 'signed' && escrow?.status !== 'held' && escrow?.status !== 'released' && iAmWorker && <span className="meta">Signed ✓ — waiting for the requester&apos;s escrow deposit.</span>}
              </div>
            )}
            <button type="button" className="chat-quit" onClick={() => { setReason(''); setErr(''); setDeclineOpen(true); }}>Quit booking</button>
          </div>
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
          <form className="chat-composer" onSubmit={sendCombined}>
            <label className="chat-amount"><span>RWF</span>
              <input ref={offerRef} type="number" min="1" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Price" aria-label="Offer amount (optional)" />
            </label>
            <input className="chat-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={offer ? 'Add a note for this offer…' : `Message ${otherName}…`} />
            <button className="chat-send" type="submit" disabled={busy || !text.trim()} aria-label="Send" title={offer ? 'Send offer' : 'Send message'}>{Icons.send}</button>
          </form>
        )}
        {jobDone && <div className="chat-composer"><span className="meta" style={{ padding: '0.25rem 0' }}>This job is {bk.status}. Chat is read-only.</span></div>}

        {signModal && (
          <div className="modal-overlay" onClick={() => setSignModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">{signModal === 'finalize' ? 'Finalize agreement' : 'Review & sign'}</div>
              <p className="meta" style={{ margin: '0.25rem 0 0.75rem' }}>
                {signModal === 'finalize'
                  ? 'Confirm the agreed price and sign — the worker signs next, then you deposit to escrow.'
                  : `Sign to accept the job at ${rwf(ag?.agreedPrice)}. Payment is held in escrow until you both confirm completion.`}
              </p>
              {signModal === 'finalize' && (
                <label className="field-label">Agreed price (RWF)
                  <input className="input" type="number" min="1" value={sigPrice} onChange={(e) => setSigPrice(e.target.value)} style={{ width: '100%' }} />
                </label>
              )}
              <label className="field-label" style={{ marginTop: '0.6rem' }}>Type your full name to sign
                <input className="input" value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="Full name" style={{ width: '100%' }} autoFocus />
              </label>
              {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
              <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setSignModal(null)}>Cancel</button>
                <button className="btn-primary" disabled={busy} onClick={signModal === 'finalize' ? doFinalize : doSign}>
                  {busy ? 'Signing…' : 'Sign agreement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {declineOpen && (
          <div className="modal-overlay" onClick={() => setDeclineOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Quit this booking?</div>
              <p className="meta" style={{ margin: '0.25rem 0 0.75rem' }}>The other party is notified with your reason. Any escrow deposit is refunded.</p>
              <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional) — e.g. couldn't agree on a price" style={{ width: '100%' }} autoFocus />
              {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
              <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setDeclineOpen(false)}>Keep booking</button>
                <button className="btn-danger" disabled={busy} onClick={doDecline}>{busy ? 'Quitting…' : 'Quit booking'}</button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
