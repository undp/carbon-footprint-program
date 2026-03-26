import { FC, useCallback, useRef } from "react";
import { CategoryCard } from "./CategoryCard";
import { Carousel, CarouselHandle } from "./Carousel";

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
  const carouselRef = useRef<CarouselHandle>(null);

  const focusedIndex = categories.findIndex((c) => c.id === selectedCategoryId);

  const handleCardClick = useCallback(
    (categoryId: string, index: number) => {
      carouselRef.current?.scrollToIndex(index);
      onCategorySelect(categoryId);
    },
    [onCategorySelect]
  );

  const handleFocusedIndexChange = useCallback(
    (index: number) => {
      onCategorySelect(categories[index].id);
    },
    [categories, onCategorySelect]
  );

  return (
    <Carousel
      ref={carouselRef}
      items={categories}
      peekWidth={PEEK_WIDTH}
      visibleCards={VISIBLE_CARDS}
      focusedIndex={focusedIndex}
      onFocusedIndexChange={handleFocusedIndexChange}
      renderItem={(category, index, isCarousel) => (
        <CategoryCard
          key={`category_${category.id}`}
          icon={category.icon}
          categoryColor={category.color}
          variant={selectedCategoryId === category.id ? "focused" : "unfocused"}
          title={category.name}
          subtitle={category.synonyms}
          description={category.description}
          explanationId={category.explanationId}
          onClick={
            isCarousel
              ? () => handleCardClick(category.id, index)
              : () => onCategorySelect(category.id)
          }
        />
      )}
    />
  );
};
