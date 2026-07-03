import { createContext, useContext, useState, useCallback } from 'react';
import { getBooking } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import BookingChat from '../components/BookingChat.jsx';

// App-level chat drawer. openChat(bookingOrId) slides in a right-side chat for a
// booking — called from booking cards (pass the booking) or from a notification
// (pass a booking id, which is fetched). Rendered once, above everything.
const ChatContext = createContext({ openChat: () => {}, closeChat: () => {} });
export function useChat() { return useContext(ChatContext); }

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);

  const openChat = useCallback(async (bookingOrId) => {
    if (bookingOrId == null) return;
    if (typeof bookingOrId === 'object') { setBooking(bookingOrId); return; }
    try { setBooking(await getBooking(bookingOrId)); } catch { /* booking gone / not a participant */ }
  }, []);
  const closeChat = useCallback(() => setBooking(null), []);

  return (
    <ChatContext.Provider value={{ openChat, closeChat }}>
      {children}
      {booking && user && (
        <BookingChat booking={booking} me={user} onClose={closeChat} onAgreed={(b) => setBooking(b)} />
      )}
    </ChatContext.Provider>
  );
}
