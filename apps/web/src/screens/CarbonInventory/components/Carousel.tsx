import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mui/material";
import type { CSSProperties } from "react";

const DEFAULT_GAP = 16;
const DEFAULT_PEEK_WIDTH = 48;
const DEFAULT_VISIBLE_CARDS = 3;

interface CarouselProps<T extends { id: string }> {
  items: T[];
  gap?: number;
  peekWidth?: number;
  visibleCards?: number;
  renderItem: (item: T, index: number, isCarousel: boolean) => ReactNode;
  carouselSx?: Record<string, CSSProperties[keyof CSSProperties]>;
  fallbackClassName?: string;
  /** When provided together with onFocusedIndexChange, enables keyboard navigation and auto-scroll */
  focusedIndex?: number;
  onFocusedIndexChange?: (index: number) => void;
}

function CarouselComponent<T extends { id: string }>({
  items,
  gap = DEFAULT_GAP,
  peekWidth = DEFAULT_PEEK_WIDTH,
  visibleCards = DEFAULT_VISIBLE_CARDS,
  renderItem,
  carouselSx,
  fallbackClassName = "flex flex-row gap-4",
  focusedIndex,
  onFocusedIndexChange,
}: CarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const needsCarousel = items.length > visibleCards;

  // Measure container width with RAF-batched ResizeObserver
  useEffect(() => {
    if (!needsCarousel || !containerRef.current) return;

    const el = containerRef.current;
    setContainerWidth(el.getBoundingClientRect().width);

    let rafId = 0;
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const width = entry.contentRect.width;
        setContainerWidth((prev) => (prev === width ? prev : width));
      });
    });

    observer.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [needsCarousel]);

  const cardWidth = useMemo(() => {
    if (!needsCarousel || containerWidth === 0) return 0;
    return Math.max(
      (containerWidth - 2 * peekWidth - 2 * gap) / visibleCards,
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

  // Auto-scroll when focusedIndex changes
  useEffect(() => {
    if (focusedIndex == null || cardWidth <= 0) return;
    scrollToIndex(focusedIndex);
  }, [focusedIndex, scrollToIndex, cardWidth]);

  // Keyboard navigation: scoped to container
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (focusedIndex == null || !onFocusedIndexChange) return;
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

  // Simple layout for ≤visibleCards items
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

  // Carousel layout (controlled scroll, no snap)
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

export const Carousel = CarouselComponent;
