import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PointerEvent as ReactPointerEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { CHATBOT_SIZE_KEY } from "@/config/constants";
import { useChatbotSize } from "./useChatbotSize";

// Source constants (mirrored so a config change trips the test deliberately).
const DEFAULT = { width: 360, height: 480 };
const MIN = { width: 320, height: 400 };
const VIEWPORT_MARGIN = 32;

const setViewport = (width: number, height: number): void => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
};

const persist = (size: { width: unknown; height: unknown }): void => {
  window.localStorage.setItem(CHATBOT_SIZE_KEY, JSON.stringify(size));
};

const readPersisted = (): unknown =>
  JSON.parse(window.localStorage.getItem(CHATBOT_SIZE_KEY) ?? "null");

// A synthetic React pointer event for startResize (it reads only these fields).
const startEvent = (props: {
  pointerId: number;
  clientX: number;
  clientY: number;
}): ReactPointerEvent<HTMLElement> =>
  ({
    preventDefault: () => {},
    ...props,
  }) as unknown as ReactPointerEvent<HTMLElement>;

// A window pointer event carrying the fields the drag listeners read.
const dispatchPointer = (
  type: "pointermove" | "pointerup" | "pointercancel",
  props: { pointerId: number; clientX?: number; clientY?: number }
): void => {
  const event = new Event(type);
  Object.assign(event, props);
  window.dispatchEvent(event);
};

beforeEach(() => {
  window.localStorage.clear();
  setViewport(1024, 768); // jsdom default; maxWidth 992, maxHeight 736
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatbotSize — hydration", () => {
  it("returns the default size when nothing is persisted", () => {
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual(DEFAULT);
  });

  it("hydrates a persisted size that fits the viewport", () => {
    persist({ width: 600, height: 500 });
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual({ width: 600, height: 500 });
  });

  it("clamps an oversized persisted size down to the viewport", () => {
    persist({ width: 5000, height: 5000 });
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual({
      width: 1024 - VIEWPORT_MARGIN,
      height: 768 - VIEWPORT_MARGIN,
    });
  });

  it("clamps a too-small persisted size up to the minimums", () => {
    persist({ width: 10, height: 10 });
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual(MIN);
  });

  it("falls back to defaults for non-numeric persisted fields", () => {
    persist({ width: "wide", height: null });
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual(DEFAULT);
  });

  it("returns the default size when the stored value is corrupt JSON", () => {
    window.localStorage.setItem(CHATBOT_SIZE_KEY, "{not valid");
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual(DEFAULT);
  });
});

describe("useChatbotSize — disabled", () => {
  it("exposes the default size and leaves the persisted value untouched", () => {
    persist({ width: 600, height: 500 });
    const { result } = renderHook(() => useChatbotSize(false));

    expect(result.current.size).toEqual(DEFAULT);
    // The persisted value survives for when a resize-capable layout returns.
    expect(readPersisted()).toEqual({ width: 600, height: 500 });
  });

  it("makes startResize a no-op", () => {
    const { result } = renderHook(() => useChatbotSize(false));

    act(() => {
      result.current.startResize(
        startEvent({ pointerId: 1, clientX: 500, clientY: 500 })
      );
    });

    expect(document.body.style.cursor).toBe("");
  });
});

describe("useChatbotSize — viewport resize", () => {
  it("re-clamps the current size when the viewport shrinks", () => {
    persist({ width: 900, height: 700 });
    const { result } = renderHook(() => useChatbotSize(true));
    expect(result.current.size).toEqual({ width: 900, height: 700 });

    act(() => {
      setViewport(500, 500); // maxWidth 468, maxHeight 468
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.size).toEqual({
      width: 500 - VIEWPORT_MARGIN,
      height: 500 - VIEWPORT_MARGIN,
    });
  });
});

describe("useChatbotSize — pointer-drag resize", () => {
  it("grows on drag and persists once on release", () => {
    const { result } = renderHook(() => useChatbotSize(true));

    act(() => {
      result.current.startResize(
        startEvent({ pointerId: 1, clientX: 500, clientY: 500 })
      );
    });
    expect(document.body.style.cursor).toBe("nwse-resize");
    // Nothing persisted yet — writes happen only on release.
    expect(readPersisted()).toBeNull();

    act(() => {
      // Dragging the top-left handle up/left grows the widget.
      dispatchPointer("pointermove", {
        pointerId: 1,
        clientX: 400,
        clientY: 450,
      });
    });
    expect(result.current.size).toEqual({ width: 460, height: 530 });

    act(() => {
      dispatchPointer("pointerup", {
        pointerId: 1,
        clientX: 400,
        clientY: 450,
      });
    });
    expect(document.body.style.cursor).toBe("");
    expect(readPersisted()).toEqual({ width: 460, height: 530 });
  });

  it("ignores move events from a different pointerId", () => {
    const { result } = renderHook(() => useChatbotSize(true));

    act(() => {
      result.current.startResize(
        startEvent({ pointerId: 1, clientX: 500, clientY: 500 })
      );
    });
    act(() => {
      dispatchPointer("pointermove", {
        pointerId: 2,
        clientX: 100,
        clientY: 100,
      });
    });

    expect(result.current.size).toEqual(DEFAULT);
  });

  it("swallows a persistence failure on release", () => {
    const { result } = renderHook(() => useChatbotSize(true));
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => {
      act(() => {
        result.current.startResize(
          startEvent({ pointerId: 1, clientX: 500, clientY: 500 })
        );
      });
      act(() => {
        dispatchPointer("pointermove", {
          pointerId: 1,
          clientX: 460,
          clientY: 460,
        });
      });
      act(() => {
        dispatchPointer("pointerup", {
          pointerId: 1,
          clientX: 460,
          clientY: 460,
        });
      });
    }).not.toThrow();

    // The size still updated in memory even though the write was swallowed.
    expect(result.current.size).toEqual({ width: 400, height: 520 });
  });

  it("resets body styles if unmounted mid-drag", () => {
    const { result, unmount } = renderHook(() => useChatbotSize(true));

    act(() => {
      result.current.startResize(
        startEvent({ pointerId: 1, clientX: 500, clientY: 500 })
      );
    });
    expect(document.body.style.cursor).toBe("nwse-resize");

    unmount();

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });
});
