import { useState, useEffect, useCallback } from 'react';

// Generic data-fetching hook
export function useApi(fetcher, deps = []) {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoad(true); setError(null);
    try { setData(await fetcher()); }
    catch (e) { setError(e.message); }
    finally { setLoad(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// Hook for mutation (POST/actions) with stable mutate reference
export function useMutation(actionFn) {
  const [loading, setLoad] = useState(false);
  const [error,   setErr]  = useState(null);
  const [result,  setRes]  = useState(null);

  // Store latest action in a ref so mutate stays stable
  const actionRef = { current: actionFn };

  const mutate = useCallback(async (...args) => {
    setLoad(true); setErr(null);
    try {
      const res = await actionRef.current(...args);
      setRes(res);
      return res;
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mutate, loading, error, data: result };
}
