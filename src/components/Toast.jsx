import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

// useToast() returns a stable notify(message) function.
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timers = useRef([]);

  const notify = useCallback((message) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message }]);
    const handle = setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
    timers.current.push(handle);
  }, []);

  // Clear any pending auto-dismiss timers if the provider unmounts.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button type="button" className="toast" key={t.id} onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
            <span aria-hidden="true">🔔</span>
            <span>{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
