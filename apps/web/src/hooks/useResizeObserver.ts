import { type RefObject, useEffect } from "react";

interface UseResizeObserverOptions {
  /**
   * Batches resize callbacks through requestAnimationFrame so that rapid
   * back-to-back resize events only trigger one render per frame.
   * Not the default because it adds one frame of delay, which can cause a
   * visible flash on initial render when the layout depends on the measured size.
   */
  raf?: boolean;
}

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
  }, [ref, callback, options?.raf]);
}
