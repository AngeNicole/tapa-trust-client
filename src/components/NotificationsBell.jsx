import { useState, useRef, useEffect } from 'react';
import { getNotifications, markNotificationRead } from '../api/client.js';
import { useAsync } from '../api/hooks.js';
import { useChat } from '../context/ChatContext.jsx';
import { Icons } from './shared/icons.jsx';

const CHAT_TYPES = new Set(['message', 'offer', 'price_agreed']);

// In-app notification bell + dropdown feed. Polls every 10s; clicking an item
// marks it read and, if it relates to a booking, opens that booking's chat.
export function NotificationsBell() {
  const { data, reload } = useAsync(() => getNotifications(), [], { intervalMs: 10000 });
  const { openChat } = useChat();
  const [open, setOpen] = useState(false);
  const items = data || [];
  const unread = items.filter((n) => !n.read).length;

  // When a new price offer lands, pop the chat open on its own so the other
  // party sees the suggested price immediately. (Only fires for offers that
  // arrive after this session's first poll, so it never re-opens old ones.)
  const seenOffers = useRef(null);
  useEffect(() => {
    if (!data) return;
    const offers = data.filter((n) => n.type === 'offer' && n.bookingId != null);
    if (seenOffers.current === null) { seenOffers.current = new Set(offers.map((o) => o.notif_id)); return; }
    const fresh = offers.filter((o) => !o.read && !seenOffers.current.has(o.notif_id));
    fresh.forEach((o) => seenOffers.current.add(o.notif_id));
    if (fresh.length) openChat(fresh[0].bookingId);
  }, [data, openChat]);

  async function openItem(n) {
    if (!n.read) {
      try { await markNotificationRead(n.notif_id); reload(); } catch { /* ignore */ }
    }
    if (n.bookingId != null) {
      setOpen(false);
      openChat(n.bookingId);
    }
  }

  return (
    <div className="notif">
      <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        {Icons.bell}
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-panel">
            <div className="notif-head">Notifications</div>
            {items.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              items.slice(0, 15).map((n) => (
                <button
                  key={n.notif_id}
                  type="button"
                  className={`notif-item ${n.read ? '' : 'notif-item--unread'}`}
                  onClick={() => openItem(n)}
                >
                  {CHAT_TYPES.has(n.type)
                    ? <span className="notif-chat-ic">{Icons.chat}</span>
                    : <span className={`activity-dot ${n.read ? 'activity-dot--pending' : 'activity-dot--accepted'}`} />}
                  <span className="notif-msg">{n.message}</span>
                  {n.bookingId != null && <span className="notif-open" aria-hidden="true">Open →</span>}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
