import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  CHATBOT_SIZE_KEY,
  CHATBOT_WIDGET_DEFAULT_HEIGHT,
  CHATBOT_WIDGET_DEFAULT_WIDTH,
  CHATBOT_WIDGET_MIN_HEIGHT,
  CHATBOT_WIDGET_MIN_WIDTH,
} from "@/config/constants";

export type ChatbotSize = { width: number; height: number };

const DEFAULT_SIZE: ChatbotSize = {
  width: CHATBOT_WIDGET_DEFAULT_WIDTH,
  height: CHATBOT_WIDGET_DEFAULT_HEIGHT,
};

// Reserved gutter between widget edges and the viewport so the panel never
// sits flush against the browser chrome.
const VIEWPORT_MARGIN = 32;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const computeMaxBounds = (): { maxWidth: number; maxHeight: number } => {
  if (typeof window === "undefined") {
    return { maxWidth: Infinity, maxHeight: Infinity };
  }
  return {
    maxWidth: Math.max(
      CHATBOT_WIDGET_MIN_WIDTH,
      window.innerWidth - VIEWPORT_MARGIN
    ),
    maxHeight: Math.max(
      CHATBOT_WIDGET_MIN_HEIGHT,
      window.innerHeight - VIEWPORT_MARGIN
    ),
  };
};

const clampSize = (size: ChatbotSize): ChatbotSize => {
  const { maxWidth, maxHeight } = computeMaxBounds();
  return {
    width: clamp(size.width, CHATBOT_WIDGET_MIN_WIDTH, maxWidth),
    height: clamp(size.height, CHATBOT_WIDGET_MIN_HEIGHT, maxHeight),
  };
};

const readPersistedSize = (): ChatbotSize => {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  try {
    const raw = window.localStorage.getItem(CHATBOT_SIZE_KEY);
    if (!raw) return DEFAULT_SIZE;
    const parsed = JSON.parse(raw) as Partial<ChatbotSize>;
    const candidate: ChatbotSize = {
      width:
        typeof parsed.width === "number"
          ? parsed.width
          : CHATBOT_WIDGET_DEFAULT_WIDTH,
      height:
        typeof parsed.height === "number"
          ? parsed.height
          : CHATBOT_WIDGET_DEFAULT_HEIGHT,
    };
    return clampSize(candidate);
  } catch {
    return DEFAULT_SIZE;
  }
};

const persistSize = (size: ChatbotSize): void => {
  try {
    window.localStorage.setItem(CHATBOT_SIZE_KEY, JSON.stringify(size));
  } catch {
    // Quota exceeded or storage disabled — swallow, size is non-critical.
  }
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  controller: AbortController;
};

/**
 * Persists a user-resizable chatbot panel size in localStorage.
 *
 * Pass `enabled = false` to short-circuit the hook on viewports where
 * resizing does not make sense (small screens): the hook still returns a
 * size — the default one — and `startResize` becomes a no-op.
 */
export const useChatbotSize = (
  enabled: boolean
): {
  size: ChatbotSize;
  startResize: (e: ReactPointerEvent<HTMLElement>) => void;
} => {
  const [persistedSize, setPersistedSize] =
    useState<ChatbotSize>(readPersistedSize);
  const dragRef = useRef<DragState | null>(null);

  // Stored size could exceed the viewport after a window resize. Re-clamp
  // so the panel never paints outside the screen.
  useEffect(() => {
    const onResize = () => {
      setPersistedSize((current) => clampSize(current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cleanup safety net: if the component unmounts mid-drag the global
  // listeners would leak and the body cursor would stay overridden.
  useEffect(() => {
    return () => {
      const drag = dragRef.current;
      if (drag) {
        drag.controller.abort();
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const startResize = (e: ReactPointerEvent<HTMLElement>): void => {
    if (!enabled) return;
    e.preventDefault();
    const controller = new AbortController();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: persistedSize.width,
      startHeight: persistedSize.height,
      controller,
    };
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      // Top-left handle anchored against bottom-right: dragging left/up
      // grows the widget.
      const next = clampSize({
        width: drag.startWidth + (drag.startX - ev.clientX),
        height: drag.startHeight + (drag.startY - ev.clientY),
      });
      setPersistedSize(next);
    };

    const finishDrag = (ev: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      drag.controller.abort();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragRef.current = null;
      // Persist only on release so a single drag is one write.
      setPersistedSize((current) => {
        persistSize(current);
        return current;
      });
    };

    window.addEventListener("pointermove", onMove, {
      signal: controller.signal,
    });
    window.addEventListener("pointerup", finishDrag, {
      signal: controller.signal,
    });
    window.addEventListener("pointercancel", finishDrag, {
      signal: controller.signal,
    });
  };

  // When resize is disabled (e.g. mobile) we expose the default size while
  // keeping the persisted value untouched so it survives a viewport change
  // back to a resize-capable layout.
  const size = enabled ? persistedSize : DEFAULT_SIZE;

  return { size, startResize };
};
