import { useState } from 'react';
import { Icons } from './shared/icons.jsx';

// Popup listing a worker's reviews with per-review like/dislike. Reactions are
// stored locally (per viewer) for now — a shared count needs a backend
// review_reactions table + endpoint (see the spec handed to the backend).
const KEY = 'tapa_review_reactions';
const loadReactions = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

function starRow(n) { const f = Math.round(Number(n) || 0); return '★'.repeat(f) + '☆'.repeat(Math.max(0, 5 - f)); }

export function ReviewsModal({ reviews, workerName, avg, count, onClose }) {
  const [reactions, setReactions] = useState(loadReactions);
  function react(id, kind) {
    setReactions((prev) => {
      const next = { ...prev, [id]: prev[id] === kind ? undefined : kind };
      if (next[id] === undefined) delete next[id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal reviews-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-head">
          <div>
            <div className="modal-title">Reviews for {workerName}</div>
            <div className="rv-sub"><span className="rv-stars">{starRow(avg)}</span> {(Number(avg) || 0).toFixed(1)} · {count} review{count === 1 ? '' : 's'}</div>
          </div>
          <button className="chat-icon-btn" onClick={onClose} aria-label="Close">{Icons.close}</button>
        </div>
        <div className="rv-list">
          {reviews.length === 0 ? (
            <p className="meta" style={{ padding: '1rem 0', textAlign: 'center' }}>No written reviews yet.</p>
          ) : reviews.map((r) => (
            <div className="rv-item" key={r.id}>
              <div className="rv-item-top">
                <span className="rv-stars">{starRow(r.rating)}</span>
                <span className="meta">{r.taskTitle}{r.date ? ` · ${r.date}` : ''}</span>
              </div>
              {r.comment ? <p className="rv-comment">“{r.comment}”</p> : <p className="rv-comment rv-empty">No comment left.</p>}
              <div className="rv-react">
                <button type="button" className={`rv-btn ${reactions[r.id] === 'like' ? 'is-on' : ''}`} onClick={() => react(r.id, 'like')} aria-pressed={reactions[r.id] === 'like'}>
                  {Icons.thumbsUp} Helpful
                </button>
                <button type="button" className={`rv-btn ${reactions[r.id] === 'dislike' ? 'is-off' : ''}`} onClick={() => react(r.id, 'dislike')} aria-pressed={reactions[r.id] === 'dislike'}>
                  {Icons.thumbsDown}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
