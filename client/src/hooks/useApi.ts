import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, getErrorStatus } from '../utils/errors';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number | undefined;
}

/**
 * Custom hook that loads data from the API and tracks loading / error state.
 * - Re-runs whenever a value in `deps` changes (e.g. filters)
 * - Ignores responses from outdated requests (no flicker when typing fast)
 * - refetch() reloads after a create / update / delete
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null, status: undefined });
  const latestRequest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (showSpinner: boolean) => {
    const requestId = ++latestRequest.current;
    if (showSpinner) setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (requestId === latestRequest.current) setState({ data, loading: false, error: null, status: 200 });
    } catch (error) {
      if (requestId === latestRequest.current) {
        setState((previous) => ({
          ...previous,
          loading: false,
          error: getErrorMessage(error),
          status: getErrorStatus(error),
        }));
      }
    }
  }, []);

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    ...state,
    refetch: () => load(true),
    // Reload in the background without replacing the page with a spinner
    refresh: () => load(false),
  };
}
