import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "@/hooks/useResizeObserver";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

const DEFAULT_GAP = 16;
const DEFAULT_PEEK_WIDTH = 48;
const DEFAULT_VISIBLE_CARDS = 3;

interface CarouselProps<T extends { id: string }> {
  items: T[];
  gap?: number;
  peekWidth?: number;
  visibleCards?: number;
  renderItem: (item: T, index: number, isCarousel: boolean) => ReactNode;
  carouselSx?: SxProps<Theme>;
  fallbackClassName?: string;
  /** When provided together with onFocusedIndexChange, enables keyboard navigation and auto-scroll */
  focusedIndex?: number;
  onFocusedIndexChange?: (index: number) => void;
  /** Minimum item count to trigger carousel mode. Defaults to visibleCards. */
  carouselThreshold?: number;
}

export function Carousel<T extends { id: string }>({
  items,
  gap = DEFAULT_GAP,
  peekWidth = DEFAULT_PEEK_WIDTH,
  visibleCards = DEFAULT_VISIBLE_CARDS,
  renderItem,
  carouselSx,
  fallbackClassName = "flex flex-row gap-4",
  focusedIndex,
  onFocusedIndexChange,
  carouselThreshold,
}: CarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const needsCarousel = items.length > (carouselThreshold ?? visibleCards);

  const handleResize = useCallback((entry: ResizeObserverEntry) => {
    setContainerWidth(entry.contentRect.width);
  }, []);

  useResizeObserver(needsCarousel ? containerRef : null, handleResize, {
    raf: true,
  });

  const cardWidth = useMemo(() => {
    if (!needsCarousel || containerWidth === 0) return 0;
    return Math.max(
      (containerWidth - 2 * peekWidth - (visibleCards - 1) * gap) /
        visibleCards,
      0
    );
  }, [needsCarousel, containerWidth, peekWidth, gap, visibleCards]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (!containerRef.current || cardWidth <= 0) return;
      const step = cardWidth + gap;
      const targetScrollLeft = Math.max(0, index * step - peekWidth);
      const maxScroll =
        containerRef.current.scrollWidth - containerRef.current.clientWidth;
      containerRef.current.scrollTo({
        left: Math.min(targetScrollLeft, maxScroll),
        behavior,
      });
    },
    [cardWidth, gap, peekWidth]
  );

  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (focusedIndex == null || cardWidth <= 0) return;
    // Use "instant" on the first scroll so restoring a non-zero focusedIndex
    // on mount doesn't animate from position 0.
    const behavior = hasScrolledRef.current ? "smooth" : "instant";
    hasScrolledRef.current = true;
    scrollToIndex(focusedIndex, behavior);
  }, [focusedIndex, scrollToIndex, cardWidth]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (focusedIndex == null || !onFocusedIndexChange) return;
      if (items.length === 0) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();
      const nextIndex =
        e.key === "ArrowRight"
          ? Math.min(focusedIndex + 1, items.length - 1)
          : Math.max(focusedIndex - 1, 0);

      if (nextIndex !== focusedIndex) {
        onFocusedIndexChange(nextIndex);
      }
    },
    [focusedIndex, onFocusedIndexChange, items.length]
  );

  if (!needsCarousel) {
    return (
      <Box className={fallbackClassName} role="listbox">
        {items.map((item, index) => (
          <Box
            key={item.id}
            role="option"
            aria-selected={focusedIndex === index}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {renderItem(item, index, false)}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      sx={{
        display: "flex",
        gap: `${gap}px`,
        overflowX: "auto",
        outline: "none",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        ...carouselSx,
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.id}
          role="option"
          aria-selected={focusedIndex === index}
          sx={{ width: cardWidth, flexShrink: 0 }}
        >
          {renderItem(item, index, true)}
        </Box>
      ))}
    </Box>
  );
}
