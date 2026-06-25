import { useState } from 'react';
import { getNotifications, markNotificationRead } from '../api/client.js';
import { useAsync } from '../api/hooks.js';
import { Icons } from './shared/icons.jsx';

// In-app notification bell + dropdown feed. Polls every 10s; clicking an item
// marks it read. No web push.
export function NotificationsBell() {
  const { data, reload } = useAsync(() => getNotifications(), [], { intervalMs: 10000 });
  const [open, setOpen] = useState(false);
  const items = data || [];
  const unread = items.filter((n) => !n.read).length;

  async function openItem(n) {
    if (!n.read) {
      try { await markNotificationRead(n.notif_id); reload(); } catch { /* ignore */ }
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
                  <span className={`activity-dot ${n.read ? 'activity-dot--pending' : 'activity-dot--accepted'}`} />
                  <span className="notif-msg">{n.message}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
