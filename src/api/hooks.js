import { useCallback, useEffect, useRef, useState } from 'react';

// Run an async loader on mount; expose { data, loading, error, reload }.
// `deps` controls when the loader is recreated (default: once).
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    return run()
      .then((d) => alive.current && setData(d))
      .catch((e) => alive.current && setError(e.message || 'Request failed'))
      .finally(() => alive.current && setLoading(false));
  }, [run]);

  useEffect(() => {
    alive.current = true;
    reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, loading, error, reload };
}
