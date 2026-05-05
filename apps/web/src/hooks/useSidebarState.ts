import { useCallback, useEffect, useRef, useState } from "react";

const HOVER_OPEN_DELAY_MS = 180;

interface UseSidebarStateResult {
  isExpanded: boolean;
  requestExpand: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

export const useSidebarState = (): UseSidebarStateResult => {
  const [isHovered, setIsHovered] = useState(false);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const handleMouseEnter = useCallback(() => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
      hoverTimerRef.current = null;
    }, HOVER_OPEN_DELAY_MS);
  }, [clearHoverTimer]);

  const handleMouseLeave = useCallback(() => {
    clearHoverTimer();
    setIsHovered(false);
  }, [clearHoverTimer]);

  const requestExpand = useCallback(() => {
    clearHoverTimer();
    setIsHovered(true);
  }, [clearHoverTimer]);

  return {
    isExpanded: isHovered,
    requestExpand,
    handleMouseEnter,
    handleMouseLeave,
  };
};
