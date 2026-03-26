import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mui/material";
import type { CSSProperties } from "react";

const DEFAULT_GAP = 16;
const DEFAULT_PEEK_WIDTH = 48;
const DEFAULT_VISIBLE_CARDS = 3;

export interface CarouselHandle {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
}

interface CarouselProps<T extends { id: string }> {
  items: T[];
  gap?: number;
  peekWidth?: number;
  visibleCards?: number;
  renderItem: (item: T, index: number, isCarousel: boolean) => ReactNode;
  carouselSx?: Record<string, CSSProperties[keyof CSSProperties]>;
  fallbackClassName?: string;
  /** When provided together with onFocusedIndexChange, enables keyboard navigation */
  focusedIndex?: number;
  onFocusedIndexChange?: (index: number) => void;
}

function CarouselInner<T extends { id: string }>(
  {
    items,
    gap = DEFAULT_GAP,
    peekWidth = DEFAULT_PEEK_WIDTH,
    visibleCards = DEFAULT_VISIBLE_CARDS,
    renderItem,
    carouselSx,
    fallbackClassName = "flex flex-row gap-4",
    focusedIndex,
    onFocusedIndexChange,
  }: CarouselProps<T>,
  ref: React.ForwardedRef<CarouselHandle>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const needsCarousel = items.length > visibleCards;

  // Measure container width
  useEffect(() => {
    if (!needsCarousel || !containerRef.current) return;

    const el = containerRef.current;
    setContainerWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
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
      if (!containerRef.current) return;
      const targetScrollLeft = index * (cardWidth + gap) - peekWidth;
      const maxScroll =
        containerRef.current.scrollWidth - containerRef.current.clientWidth;
      const clamped = Math.max(0, Math.min(targetScrollLeft, maxScroll));
      containerRef.current.scrollTo({ left: clamped, behavior });
    },
    [cardWidth, gap, peekWidth]
  );

  useImperativeHandle(ref, () => ({ scrollToIndex }), [scrollToIndex]);

  // Keyboard navigation: left/right arrow keys
  useEffect(() => {
    if (!needsCarousel || focusedIndex == null || !onFocusedIndexChange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const nextIndex =
        e.key === "ArrowRight"
          ? Math.min(focusedIndex + 1, items.length - 1)
          : Math.max(focusedIndex - 1, 0);

      if (nextIndex !== focusedIndex) {
        onFocusedIndexChange(nextIndex);
        scrollToIndex(nextIndex, "auto");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    needsCarousel,
    focusedIndex,
    onFocusedIndexChange,
    items.length,
    scrollToIndex,
  ]);

  // Simple layout for ≤visibleCards items
  if (!needsCarousel) {
    return (
      <Box className={fallbackClassName}>
        {items.map((item, index) => (
          <Box key={item.id} sx={{ flex: 1, minWidth: 0 }}>
            {renderItem(item, index, false)}
          </Box>
        ))}
      </Box>
    );
  }

  // Carousel layout (scroll-snap)
  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        gap: `${gap}px`,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        scrollPaddingLeft: `${peekWidth}px`,
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        ...carouselSx,
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.id}
          sx={{ width: cardWidth, flexShrink: 0, scrollSnapAlign: "start" }}
        >
          {renderItem(item, index, true)}
        </Box>
      ))}
    </Box>
  );
}

export const Carousel = forwardRef(CarouselInner) as <T extends { id: string }>(
  props: CarouselProps<T> & { ref?: React.Ref<CarouselHandle> }
) => ReactNode;
