import { useCallback, useEffect, useRef, useState } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";

const HOVER_OPEN_DELAY_MS = 180;

interface UseSidebarStateResult {
  isExpanded: boolean;
  isPinned: boolean;
  togglePin: () => void;
  requestExpand: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

export const useSidebarState = (): UseSidebarStateResult => {
  const isPinned = useSidebarStore((state) => state.isPinned);
  const togglePin = useSidebarStore((state) => state.togglePin);
  const isForcedOpen = useSidebarStore((state) => state.isForcedOpen);

  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered || isForcedOpen;

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
    isExpanded,
    isPinned,
    togglePin,
    requestExpand,
    handleMouseEnter,
    handleMouseLeave,
  };
};
