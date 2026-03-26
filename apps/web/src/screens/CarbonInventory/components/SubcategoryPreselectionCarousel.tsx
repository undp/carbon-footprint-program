import {
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mui/material";
import { SubcategoryPreselectionCard } from "./SubcategoryPreselectionCard";
import type { SubcategoryPreselectionMergedData } from "../types";

const GAP = 16;
const PEEK_WIDTH = 96;
const VISIBLE_CARDS = 2;

interface SubcategoryPreselectionCarouselProps {
  categories: SubcategoryPreselectionMergedData;
}

export const SubcategoryPreselectionCarousel: FC<
  SubcategoryPreselectionCarouselProps
> = ({ categories }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [focusedCategoryId, setFocusedCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );

  const needsCarousel = categories.length > VISIBLE_CARDS;

  // If the focused category no longer exists in the list, fall back to the first one
  const resolvedFocusedId =
    categories.length > 0 && !categories.some((c) => c.id === focusedCategoryId)
      ? categories[0].id
      : focusedCategoryId;

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

  // Card width: VISIBLE_CARDS cards + 2 gaps + 2 peeks = containerWidth
  const cardWidth = useMemo(() => {
    if (!needsCarousel || containerWidth === 0) return 0;
    return Math.max(
      (containerWidth - 2 * PEEK_WIDTH - 2 * GAP) / VISIBLE_CARDS,
      0
    );
  }, [needsCarousel, containerWidth]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (!containerRef.current) return;
      const targetScrollLeft = index * (cardWidth + GAP) - PEEK_WIDTH;
      const maxScroll =
        containerRef.current.scrollWidth - containerRef.current.clientWidth;
      const clamped = Math.max(0, Math.min(targetScrollLeft, maxScroll));
      containerRef.current.scrollTo({ left: clamped, behavior });
    },
    [cardWidth]
  );

  const handleBoxClick = useCallback(
    (_e: MouseEvent, categoryId: string, index: number) => {
      if (!needsCarousel) return;
      setFocusedCategoryId(categoryId);
      scrollToIndex(index);
    },
    [needsCarousel, scrollToIndex]
  );

  // Keyboard navigation: left/right arrow keys
  useEffect(() => {
    if (!needsCarousel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const currentIndex = categories.findIndex(
        (c) => c.id === resolvedFocusedId
      );
      const nextIndex =
        e.key === "ArrowRight"
          ? Math.min(currentIndex + 1, categories.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (nextIndex !== currentIndex) {
        setFocusedCategoryId(categories[nextIndex].id);
        scrollToIndex(nextIndex, "auto");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [needsCarousel, categories, resolvedFocusedId, scrollToIndex]);

  // Simple layout for ≤VISIBLE_CARDS categories
  if (!needsCarousel) {
    return (
      <Box className="flex min-h-0 flex-1 flex-row items-stretch gap-4 overflow-x-auto">
        {categories.map((category) => (
          <SubcategoryPreselectionCard
            key={category.id}
            category={category}
            variant="default"
          />
        ))}
      </Box>
    );
  }

  // Carousel layout for >VISIBLE_CARDS categories (scroll-snap)
  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        alignItems: "stretch",
        gap: `${GAP}px`,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        scrollPaddingLeft: `${PEEK_WIDTH}px`,
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        minHeight: 0,
        flex: 1,
      }}
    >
      {categories.map((category, index) => (
        <Box
          key={`carousel_${category.id}`}
          sx={{ width: cardWidth, flexShrink: 0, scrollSnapAlign: "start" }}
        >
          <SubcategoryPreselectionCard
            category={category}
            variant={
              resolvedFocusedId === category.id ? "focused" : "unfocused"
            }
            onClick={(e) => handleBoxClick(e, category.id, index)}
          />
        </Box>
      ))}
    </Box>
  );
};
