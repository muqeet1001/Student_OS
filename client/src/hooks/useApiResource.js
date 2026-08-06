import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Fetches a GET endpoint and tracks loading/error state.
 *
 * `deps` controls refetching. The in-flight request is aborted when the path
 * changes or the component unmounts, so a slow response can never overwrite
 * newer data.
 */
export function useApiResource(path, { deps = [], enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const controllerRef = useRef(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!enabled) return undefined;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (!quiet) setLoading(true);
      setError(null);

      try {
        const result = await api.get(path, { signal: controller.signal });
        if (!controller.signal.aborted) setData(result);
        return result;
      } catch (caught) {
        if (caught.name !== 'AbortError' && !controller.signal.aborted) setError(caught);
        return undefined;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, enabled, ...deps],
  );

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  return { data, setData, error, loading, refetch: load };
}
