import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { Avatar, StatusBadge, Loading, EmptyState, rwf } from './shared/ui.jsx';
import { Icons } from './shared/icons.jsx';

// Dedicated Messages inbox — one conversation per booking. Opens the chat drawer.
// (Each booking has exactly one chat; a shared "unread" count would need a
// backend last-read marker, so rows show status + agreed price instead.)
export function MessagesView({ bookings, loading }) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const iAmWorker = user?.role === 'worker';
  const convos = (bookings || []).slice().sort((a, b) => b.booking_id - a.booking_id);

  return (
    <>
      <h1>Messages</h1>
      <p className="subtitle">Your conversations — negotiate, agree a price, and coordinate the job.</p>
      {loading ? <Loading /> : convos.length === 0 ? (
        <EmptyState icon={Icons.chat} title="No conversations yet" hint={iAmWorker ? 'When a requester books you, your chat appears here.' : 'Book a worker to start a conversation.'} />
      ) : (
        <div className="card" style={{ marginTop: '0.75rem', padding: 0 }}>
          <div className="convos">
            {convos.map((b) => {
              const other = iAmWorker ? b.requesterName : b.workerName;
              return (
                <button type="button" className="convo" key={b.booking_id} onClick={() => openChat(b)}>
                  <Avatar name={other} className="avatar" style={{ width: 44, height: 44, borderRadius: 999, fontSize: '0.9rem' }} />
                  <div className="convo-info">
                    <div className="convo-top">
                      <span className="convo-name">{other}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="convo-sub">{b.taskTitle}{b.agreedPrice != null ? ` · ${rwf(b.agreedPrice)} agreed` : ''}</div>
                  </div>
                  <span className="convo-open">{Icons.chat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
