import { useEffect, useState } from 'react';

/** Poll a JSON endpoint; keeps the last good value and exposes the latest error. */
export function usePolling(url, intervalMs = 1000) {
  const [state, setState] = useState({ data: null, error: null });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) setState({ data, error: null });
      } catch (error) {
        if (active) setState((prev) => ({ ...prev, error: error.message }));
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [url, intervalMs]);

  return state;
}
