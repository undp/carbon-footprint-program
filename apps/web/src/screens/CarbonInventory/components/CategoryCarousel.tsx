import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { CategoryCard } from "./CategoryCard";

const GAP = 16;
const PEEK_WIDTH = 48;

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
  // startIndex = index of the first fully visible card in the 3-card window
  const [startIndex, setStartIndex] = useState(0);

  const needsCarousel = categories.length > 3;
  const maxStartIndex = Math.max(categories.length - 3, 0);

  // Measure container width
  useEffect(() => {
    if (!needsCarousel || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [needsCarousel]);

  // Card width: 3 cards + 2 gaps + 2 peeks = containerWidth
  const cardWidth = useMemo(() => {
    if (!needsCarousel || containerWidth === 0) return 0;
    return (containerWidth - 2 * PEEK_WIDTH - 2 * GAP) / 3;
  }, [needsCarousel, containerWidth]);

  // translateX: different formula for edges vs middle
  const translateX = useMemo(() => {
    if (!needsCarousel || cardWidth === 0) return 0;

    // First position: flush left (no left peek)
    if (startIndex === 0) return 0;

    // Last position: flush right (no right peek)
    if (startIndex >= maxStartIndex) {
      const totalStripWidth =
        categories.length * cardWidth + (categories.length - 1) * GAP;
      return containerWidth - totalStripWidth;
    }

    // Middle positions: peek on both sides
    return -startIndex * (cardWidth + GAP) + PEEK_WIDTH;
  }, [
    needsCarousel,
    startIndex,
    cardWidth,
    categories.length,
    containerWidth,
    maxStartIndex,
  ]);

  const handleCardClick = useCallback(
    (categoryId: string, index: number) => {
      if (needsCarousel) {
        // Click left visible card (or peek): shift left to center it
        if (index <= startIndex && startIndex > 0) {
          setStartIndex(startIndex - 1);
        }
        // Click right visible card (or peek): shift right to center it
        else if (index >= startIndex + 2 && startIndex < maxStartIndex) {
          setStartIndex(startIndex + 1);
        }
      }
      onCategorySelect(categoryId);
    },
    [needsCarousel, startIndex, maxStartIndex, onCategorySelect]
  );

  // Simple layout for ≤3 categories
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

  // Carousel layout for >3 categories
  return (
    <Box ref={containerRef} className="relative overflow-hidden">
      <Box
        className="flex flex-row"
        sx={{
          gap: `${GAP}px`,
          transform: `translateX(${translateX}px)`,
          transition: "transform 300ms ease-in-out",
        }}
      >
        {categories.map((category, index) => (
          <Box
            key={`category_${category.id}`}
            sx={{ width: cardWidth, flexShrink: 0 }}
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
    </Box>
  );
};
