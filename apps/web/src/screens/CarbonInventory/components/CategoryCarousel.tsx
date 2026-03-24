import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { CategoryCard } from "./CategoryCard";

const GAP = 16;
const PEEK_WIDTH = 48;
const VISIBLE_CARDS = 3;

interface CategoryData {
  id: string;
  icon: string;
  color: string;
  name: string;
  synonyms: string | null;
  description: string | null;
  explanationId: string | null;
}

interface CategoryCarouselProps {
  categories: CategoryData[];
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
}

export const CategoryCarousel: FC<CategoryCarouselProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const needsCarousel = categories.length > VISIBLE_CARDS;

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

  const handleCardClick = useCallback(
    (categoryId: string, index: number) => {
      if (needsCarousel && containerRef.current) {
        // Scroll so the clicked card's left neighbor peeks in
        const targetScrollLeft = index * (cardWidth + GAP) - PEEK_WIDTH;
        const maxScroll =
          containerRef.current.scrollWidth - containerRef.current.clientWidth;
        const clamped = Math.max(0, Math.min(targetScrollLeft, maxScroll));
        containerRef.current.scrollTo({ left: clamped, behavior: "smooth" });
      }
      onCategorySelect(categoryId);
    },
    [needsCarousel, cardWidth, onCategorySelect]
  );

  // Simple layout for ≤VISIBLE_CARDS categories
  if (!needsCarousel) {
    return (
      <Box className="flex flex-row gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={`category_${category.id}`}
            icon={category.icon}
            categoryColor={category.color}
            variant={
              selectedCategoryId === category.id ? "focused" : "unfocused"
            }
            title={category.name}
            subtitle={category.synonyms}
            description={category.description}
            explanationId={category.explanationId}
            onClick={() => onCategorySelect(category.id)}
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
        gap: `${GAP}px`,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        scrollPaddingLeft: `${PEEK_WIDTH}px`,
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {categories.map((category, index) => (
        <Box
          key={`category_${category.id}`}
          sx={{ width: cardWidth, flexShrink: 0, scrollSnapAlign: "start" }}
        >
          <CategoryCard
            icon={category.icon}
            categoryColor={category.color}
            variant={
              selectedCategoryId === category.id ? "focused" : "unfocused"
            }
            title={category.name}
            subtitle={category.synonyms}
            description={category.description}
            explanationId={category.explanationId}
            onClick={() => handleCardClick(category.id, index)}
          />
        </Box>
      ))}
    </Box>
  );
};
