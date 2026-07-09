import { useState } from 'react';
import { acceptBooking, checkinBooking, checkoutBooking, confirmStart, confirmCompletion } from '../api/client.js';
import { Icons } from './shared/icons.jsx';
import { rwf, ErrorNote, EscrowBanner } from './shared/ui.jsx';

// One vertical stepper for the whole booking journey, shown to BOTH parties.
// Each step shows what it is, whether it's done, and — for the current step —
// what happens next: an action button when it's this viewer's turn, or a
// "waiting for …" line when it's the other party's turn. Chat-driven steps
// (agree price, sign, pay) open the chat drawer where that UI already lives.
export function BookingStepper({ b, role, reload, openChat, onReview }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run(promise, after) {
    setErr(''); setBusy(true);
    try { await promise; reload?.(); after?.(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (b.status === 'cancelled') {
    return (
      <div className="bstep-wrap">
        <div className="bstep-cancelled">{Icons.close} Booking cancelled{b.cancelReason ? ` — “${b.cancelReason}”` : ''}.</div>
      </div>
    );
  }

  const ag = b.agreement || {};
  const amount = b.agreedPrice ?? ag.agreedPrice ?? b.escrow?.amount ?? null;
  const money = amount != null ? rwf(amount) : 'the amount';
  const escrowHeld = ['held', 'released'].includes(b.escrow?.status);
  const released = b.escrow?.status === 'released' || b.status === 'completed';
  const bothSigned = ag.status === 'signed' || (ag.requesterSigned && ag.workerSigned) || escrowHeld;
  const iSigned = role === 'worker' ? ag.workerSigned : ag.requesterSigned;
  const isWorker = role === 'worker';
  const openChatFn = () => openChat?.(b);

  // Each step: done flag, the copy for done/todo, and — when it's the current
  // step — whose turn it is (myTurn) plus the action, or who to wait for.
  const steps = [
    {
      key: 'accept',
      title: 'Booking accepted',
      done: b.status !== 'pending',
      doneText: `${b.workerName || 'The worker'} accepted the job.`,
      todo: 'The worker reviews and accepts the request.',
      myTurn: isWorker,
      waitFor: b.workerName || 'the worker',
      cta: 'Accept job',
      act: () => run(acceptBooking(b.booking_id)),
    },
    {
      key: 'price',
      title: amount != null ? `Price agreed · ${money}` : 'Agree a price',
      done: amount != null,
      doneText: `You agreed on ${money}.`,
      todo: 'Chat to negotiate and agree a price for the job.',
      myTurn: true, // either party can propose / accept in chat
      waitFor: isWorker ? (b.requesterName || 'the requester') : (b.workerName || 'the worker'),
      cta: 'Agree price in chat',
      act: openChatFn,
    },
    {
      key: 'sign',
      title: 'Sign the agreement',
      done: bothSigned,
      doneText: 'Both parties signed the agreement.',
      todo: iSigned
        ? `You’ve signed — waiting for ${isWorker ? (b.requesterName || 'the requester') : (b.workerName || 'the worker')} to sign.`
        : 'Review the agreement and draw your signature in chat.',
      myTurn: !iSigned,
      waitFor: isWorker ? (b.requesterName || 'the requester') : (b.workerName || 'the worker'),
      cta: 'Review & sign in chat',
      act: openChatFn,
    },
    {
      key: 'pay',
      title: escrowHeld ? `${money} held in escrow` : 'Payment held in escrow',
      done: escrowHeld,
      doneText: `${money} is held safely in escrow until the job is confirmed done.`,
      todo: isWorker
        ? 'The requester pays — the money is then held in escrow until you both confirm the job is done.'
        : 'Pay now. Your money is held safely in escrow and only released when you both confirm the job is done.',
      myTurn: !isWorker,
      waitFor: b.requesterName || 'the requester',
      cta: 'Pay & hold in escrow',
      act: openChatFn,
    },
    {
      key: 'checkin',
      title: 'Worker checks in',
      done: b.checkedIn,
      doneText: `${b.workerName || 'The worker'} checked in on site.`,
      todo: 'The worker checks in when they arrive to start the job.',
      myTurn: isWorker,
      waitFor: b.workerName || 'the worker',
      cta: 'Check in',
      act: () => run(checkinBooking(b.booking_id)),
    },
    {
      key: 'start',
      title: 'Start confirmed',
      done: b.startConfirmed,
      doneText: 'The requester confirmed the work started.',
      todo: 'The requester confirms the worker has started.',
      myTurn: !isWorker,
      waitFor: b.requesterName || 'the requester',
      cta: 'Confirm start',
      act: () => run(confirmStart(b.booking_id)),
    },
    {
      key: 'checkout',
      title: 'Worker checks out',
      done: b.checkedOut,
      doneText: `${b.workerName || 'The worker'} checked out.`,
      todo: 'The worker checks out when the job is finished.',
      myTurn: isWorker,
      waitFor: b.workerName || 'the worker',
      cta: 'Check out',
      act: () => run(checkoutBooking(b.booking_id)),
    },
    {
      key: 'complete',
      title: released ? `Completed · ${money} released` : 'Confirm completion & release payment',
      done: b.status === 'completed',
      doneText: `Job complete — ${money} released to ${isWorker ? 'you' : 'the worker'}.`,
      todo: 'The requester confirms completion, releasing the escrow to the worker.',
      myTurn: !isWorker,
      waitFor: b.requesterName || 'the requester',
      cta: 'Confirm completion',
      act: () => run(confirmCompletion(b.booking_id), () => onReview?.(b)),
    },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="bstep-wrap">
      <EscrowBanner b={b} role={role} />
      <div className="bstep-head">Booking progress</div>
      <ol className="bstep-list">
        {steps.map((s, i) => {
          const state = s.done ? 'done' : i === currentIdx ? 'current' : 'upcoming';
          return (
            <li key={s.key} className={`bstep bstep--${state}`}>
              <span className="bstep-dot">{s.done ? Icons.check : i + 1}</span>
              <div className="bstep-body">
                <div className="bstep-title">{s.title}</div>
                <div className="bstep-desc">{state === 'done' ? s.doneText : s.todo}</div>
                {state === 'current' && (
                  s.myTurn
                    ? <button type="button" className="btn-primary bstep-cta" disabled={busy} onClick={s.act}>{s.cta}</button>
                    : <div className="bstep-wait">{Icons.clock} Waiting for {s.waitFor}…</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <ErrorNote message={err} />
    </div>
  );
}
