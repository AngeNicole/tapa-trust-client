import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getBooking, getBookingMessages, sendBookingMessage, agreeBookingPrice,
  finalizeAgreement, signAgreement, depositEscrow, declineBooking,
} from '../api/client.js';
import { rwf, Avatar } from './shared/ui.jsx';
import { Icons } from './shared/icons.jsx';
import { SignaturePad } from './SignaturePad.jsx';

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

// One party's signature line — shows the drawn signature image (data URL) or a
// typed name, or a pending state.
function Sig({ label, signed, value }) {
  const isImg = typeof value === 'string' && value.startsWith('data:image');
  return (
    <span className={`chat-sig ${signed ? 'is-signed' : ''}`}>
      <span>{signed ? '✓' : '○'} {label}</span>
      {signed && (isImg
        ? <img className="chat-sig-img" src={value} alt={`${label} signature`} />
        : value ? <em className="chat-sig-name">{value}</em> : null)}
    </span>
  );
}

// The chat renders as a right-side drawer by default, or as an inline panel that
// fills its container when embedded in the two-pane Messages inbox.
function ChatShell({ inline, onClose, children }) {
  if (inline) {
    return <section className="chat-panel chat-panel--inline" role="region" aria-label="Booking chat">{children}</section>;
  }
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="chat-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Booking chat">
        {children}
      </aside>
    </div>
  );
}

export default function BookingChat({ booking, me, onClose, onAgreed, inline = false }) {
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
  const [sig, setSig] = useState('');   // drawn signature (PNG data URL)
  const [sigPrice, setSigPrice] = useState('');
  const [reason, setReason] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('MTN MoMo');
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
    if (!sig) { setErr('Draw your signature to sign.'); return; }
    setBusy(true); setErr('');
    try { refresh(await finalizeAgreement(bk.booking_id, { amount: n, signature: sig })); setSignModal(null); setSig(''); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doSign() {
    if (!sig) { setErr('Draw your signature to sign.'); return; }
    setBusy(true); setErr('');
    try { refresh(await signAgreement(bk.booking_id, sig)); setSignModal(null); setSig(''); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doPay() {
    setBusy(true); setErr('');
    try {
      const b = await depositEscrow(bk.booking_id);
      // Record the (simulated) method in the thread so both parties see it.
      await sendBookingMessage(bk.booking_id, { body: `Paid ${rwf(ag?.agreedPrice)} via ${payMethod} — held in escrow.` }).catch(() => {});
      refresh(b); setPayOpen(false); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doDecline() {
    setBusy(true); setErr('');
    try { refresh(await declineBooking(bk.booking_id, reason.trim())); setDeclineOpen(false); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const load = useCallback(async () => {
    // Background poll — messages AND the booking, so agreement/escrow/status
    // changes (sign, deposit, etc.) appear live without a refresh. Silent on
    // transient failures.
    try {
      const [data, fresh] = await Promise.all([
        getBookingMessages(booking.booking_id),
        getBooking(booking.booking_id).catch(() => null),
      ]);
      setMessages(data.messages || []);
      setAgreed(data.agreedPrice ?? null);
      if (fresh) setBk(fresh);
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
    <ChatShell inline={inline} onClose={onClose}>
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

        {dealEnabled && !jobDone && (() => {
          const paid = escrow?.status === 'held' || escrow?.status === 'released';
          const stages = [
            { label: 'Agree', done: !!ag, active: !ag },
            { label: 'Sign', done: ag?.status === 'signed', active: ag && ag.status !== 'signed' },
            { label: 'Pay', done: paid, active: ag?.status === 'signed' && !paid },
          ];
          return (
            <div className="chat-agreement">
              <div className="chat-steps">
                {stages.map((s) => (
                  <span key={s.label} className={`chat-step ${s.done ? 'is-done' : s.active ? 'is-active' : ''}`}>
                    <i>{s.done ? '✓' : ''}</i>{s.label}
                  </span>
                ))}
              </div>

              {/* Single current action for this step */}
              {!ag && agreed == null && <p className="chat-step-hint">Agree a price below, then finalize the agreement.</p>}
              {!ag && agreed != null && !iAmWorker && (
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSigPrice(String(agreed || '')); setSig(''); setErr(''); setSignModal('finalize'); }}>
                  {Icons.checkCircle} Finalize agreement · {rwf(agreed)}
                </button>
              )}
              {!ag && agreed != null && iAmWorker && <p className="chat-step-hint">Price agreed — waiting for the requester to finalize.</p>}

              {ag && (
                <div className="chat-ag-card">
                  <div className="chat-ag-row"><span>Agreed price</span><b>{rwf(ag.agreedPrice)}</b></div>
                  <div className="chat-ag-sigs">
                    <Sig label="Requester" signed={ag.requesterSigned} value={ag.requesterSignature} />
                    <Sig label="Worker" signed={ag.workerSigned} value={ag.workerSignature} />
                  </div>
                  {ag.status === 'proposed' && iAmWorker && <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSig(''); setErr(''); setSignModal('sign'); }}>Review &amp; sign</button>}
                  {ag.status === 'proposed' && !iAmWorker && <p className="chat-step-hint">Signed — waiting for the worker to sign.</p>}
                  {ag.status === 'signed' && !paid && !iAmWorker && <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setErr(''); setPayOpen(true); }}>Pay {rwf(ag.agreedPrice)}</button>}
                  {ag.status === 'signed' && !paid && iAmWorker && <p className="chat-step-hint">Both signed — waiting for the requester to pay.</p>}
                  {escrow?.status === 'held' && <div className="chat-escrow is-held">✓ Paid · held in escrow. Work can begin — track it in Bookings.</div>}
                  {escrow?.status === 'released' && <div className="chat-escrow is-released">✓ Payment released to the worker.</div>}
                </div>
              )}
              <button type="button" className="chat-quit" onClick={() => { setReason(''); setErr(''); setDeclineOpen(true); }}>Quit booking</button>
            </div>
          );
        })()}

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
              <div className="field-label" style={{ marginTop: '0.6rem' }}>Sign below</div>
              <SignaturePad onChange={setSig} />
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

        {payOpen && (
          <div className="modal-overlay" onClick={() => setPayOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Pay {rwf(ag?.agreedPrice)}</div>
              <p className="meta" style={{ margin: '0.25rem 0 0.75rem' }}>Choose how to pay. Funds are held in escrow and released to the worker only when you both confirm the job is done. (Simulated — no real charge.)</p>
              <div className="pay-methods">
                {[
                  { id: 'MTN MoMo', label: 'MTN Mobile Money', sub: 'Pay with your MoMo number' },
                  { id: 'Airtel Money', label: 'Airtel Money', sub: 'Pay with Airtel Money' },
                  { id: 'Card', label: 'Card', sub: 'Visa / Mastercard' },
                ].map((m) => (
                  <button key={m.id} type="button" className={`pay-method ${payMethod === m.id ? 'is-sel' : ''}`} onClick={() => setPayMethod(m.id)}>
                    <span className="pay-radio" />
                    <span><span className="pay-method-t">{m.label}</span><span className="pay-method-s">{m.sub}</span></span>
                  </button>
                ))}
              </div>
              {err && <div className="form-error" style={{ marginTop: '0.5rem' }}>{err}</div>}
              <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setPayOpen(false)}>Cancel</button>
                <button className="btn-primary" disabled={busy} onClick={doPay}>{busy ? 'Paying…' : `Pay ${rwf(ag?.agreedPrice)}`}</button>
              </div>
            </div>
          </div>
        )}
    </ChatShell>
  );
}
