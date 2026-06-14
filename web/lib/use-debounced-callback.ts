import { useCallback, useEffect, useRef } from 'react';

/** Agrupa vários callbacks (ex.: eventos realtime) em uma única execução. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs = 400,
): T {
  const fnRef = useRef(fn);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return useCallback((...args: Parameters<T>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fnRef.current(...args);
    }, delayMs);
  }, [delayMs]) as T;
}
