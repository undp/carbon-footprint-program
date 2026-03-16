import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";

type OverflowDependency = string | number | boolean | null | undefined;

export const useOverflowTooltip = <T extends HTMLElement>(
  dependencies: readonly OverflowDependency[]
) => {
  const [isOverflowed, setIsOverflowed] = useState(false);
  const elementRef = useRef<T | null>(null);
  const dependencyKey = JSON.stringify(dependencies);

  const measureOverflow = useCallback((element: T | null) => {
    if (!element) {
      setIsOverflowed(false);
      return;
    }

    setIsOverflowed(
      element.scrollHeight > element.clientHeight ||
        element.scrollWidth > element.clientWidth
    );
  }, []);

  const overflowRef = useCallback<RefCallback<T>>(
    (element) => {
      elementRef.current = element;
      measureOverflow(element);
    },
    [measureOverflow]
  );

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const animationFrameId = requestAnimationFrame(() => {
      measureOverflow(elementRef.current);
    });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow(elementRef.current);
    });

    resizeObserver.observe(element);

    if (element.parentElement) {
      resizeObserver.observe(element.parentElement);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [dependencyKey, measureOverflow]);

  return {
    isOverflowed,
    overflowRef,
  };
};
