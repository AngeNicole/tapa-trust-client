import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BookingChat from './BookingChat.jsx';
import { Avatar, StatusBadge, Loading, EmptyState, rwf } from './shared/ui.jsx';
import { Icons } from './shared/icons.jsx';

// Two-pane Messages inbox: a chat list on the left, the selected conversation
// inline on the right (an empty state until one is picked). One chat per booking.
// Elsewhere (booking cards, notifications) chats still open in the drawer via
// ChatContext; here the same BookingChat renders inline (`inline` prop).
export function MessagesView({ bookings, loading }) {
  const { user } = useAuth();
  const iAmWorker = user?.role === 'worker';
  const convos = (bookings || []).slice().sort((a, b) => b.booking_id - a.booking_id);
  const [selectedId, setSelectedId] = useState(null);
  const selected = convos.find((b) => b.booking_id === selectedId) || null;

  return (
    <>
      <h1>Messages</h1>
      <p className="subtitle">Your conversations — negotiate, agree a price, and coordinate the job.</p>
      {loading ? <Loading /> : convos.length === 0 ? (
        <EmptyState
          icon={Icons.chat}
          title="No conversations yet"
          hint={iAmWorker ? 'When a requester books you, your chat appears here.' : 'Book a worker to start a conversation.'}
        />
      ) : (
        <div className={`inbox ${selected ? 'has-selection' : ''}`}>
          <aside className="inbox-list">
            <div className="inbox-list-head">Recent chats</div>
            <div className="convos">
              {convos.map((b) => {
                const other = iAmWorker ? b.requesterName : b.workerName;
                return (
                  <button
                    type="button"
                    className={`convo ${b.booking_id === selectedId ? 'is-active' : ''}`}
                    key={b.booking_id}
                    onClick={() => setSelectedId(b.booking_id)}
                  >
                    <Avatar name={other} className="avatar" style={{ width: 44, height: 44, borderRadius: 999, fontSize: '0.9rem' }} />
                    <div className="convo-info">
                      <div className="convo-top">
                        <span className="convo-name">{other}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="convo-sub">{b.taskTitle}{b.agreedPrice != null ? ` · ${rwf(b.agreedPrice)} agreed` : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="inbox-body">
            {selected ? (
              <BookingChat
                key={selected.booking_id}
                booking={selected}
                me={user}
                inline
                onClose={() => setSelectedId(null)}
                onAgreed={() => {}}
              />
            ) : (
              <div className="inbox-empty">
                <span className="inbox-empty-ic">{Icons.chat}</span>
                <div className="inbox-empty-t">No conversation selected</div>
                <p className="meta">Pick a chat on the left to open it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
