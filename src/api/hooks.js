import { useCallback, useEffect, useRef, useState } from 'react';

// Run an async loader on mount; expose { data, loading, error, reload }.
// Pass { intervalMs } to poll in the background — polls refresh data silently
// (no loading flicker, errors swallowed so a transient blip keeps last data).
export function useAsync(loader, deps = [], { intervalMs } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(
    (silent = false) => {
      if (!silent) { setLoading(true); setError(''); }
      return run()
        .then((d) => { if (alive.current) setData(d); })
        .catch((e) => { if (!silent && alive.current) setError(e.message || 'Request failed'); })
        .finally(() => { if (!silent && alive.current) setLoading(false); });
    },
    [run]
  );

  useEffect(() => {
    alive.current = true;
    reload();
    return () => { alive.current = false; };
  }, [reload]);

  useEffect(() => {
    if (!intervalMs) return undefined;
    const id = setInterval(() => reload(true), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, reload]);

  return { data, loading, error, reload };
}

// Watch a bookings list and fire a toast when the OTHER party advances it.
// On first load it just records the baseline (no alerts); later polls diff.
export function useBookingAlerts(bookings, role, notify) {
  const prev = useRef(null);
  useEffect(() => {
    if (!bookings) return;
    const prevMap = prev.current;
    if (prevMap) {
      for (const b of bookings) {
        const p = prevMap.get(b.booking_id);
        const title = `“${b.taskTitle}”`;
        if (role === 'requester') {
          if ((!p || p.status === 'pending') && b.status === 'accepted')
            notify(`${b.workerName} accepted ${title}`);
          if ((!p || !p.checkedIn) && b.checkedIn && !b.startConfirmed)
            notify(`${b.workerName} checked in — you can confirm start on ${title}`);
          if ((!p || !p.checkedOut) && b.checkedOut && !b.endConfirmed)
            notify(`${b.workerName} checked out — you can confirm completion on ${title}`);
        } else {
          if (!p && b.status === 'pending')
            notify(`New job: ${title} from ${b.requesterName}`);
          if ((!p || !p.startConfirmed) && b.startConfirmed && b.status === 'in_progress' && !b.checkedOut)
            notify(`Requester confirmed start — check out when done on ${title}`);
          if ((!p || p.status !== 'completed') && b.status === 'completed')
            notify(`${title} completed — payment released`);
        }
      }
    }
    prev.current = new Map(bookings.map((b) => [b.booking_id, b]));
  }, [bookings, role, notify]);
}
