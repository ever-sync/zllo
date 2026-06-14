import { useCallback, useEffect, useRef } from 'react';

/** Agrupa vários eventos realtime em uma única chamada a `load`. */
export function useDebouncedReload(load: () => void | Promise<void>, delayMs = 400) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void load();
    }, delayMs);
  }, [load, delayMs]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return schedule;
}
