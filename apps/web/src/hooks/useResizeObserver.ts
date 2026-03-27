import { type RefObject, useEffect } from "react";

interface UseResizeObserverOptions {
  /** Wrap the callback in requestAnimationFrame for batching. */
  raf?: boolean;
}

/**
 * Observes size changes on the element referenced by `ref` and invokes
 * `callback` for every resize (and once on mount for the initial measurement).
 */
export function useResizeObserver(
  ref: RefObject<HTMLElement | null>,
  callback: (entry: ResizeObserverEntry) => void,
  options?: UseResizeObserverOptions
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId = 0;

    const handler = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      if (options?.raf) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => callback(entry));
      } else {
        callback(entry);
      }
    };

    const observer = new ResizeObserver(handler);
    observer.observe(el);

    return () => {
      if (options?.raf) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, options?.raf]);
}
