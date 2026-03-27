import { FC, useCallback } from "react";
import type { IconName } from "@repo/types";
import { CategoryCard } from "./CategoryCard";
import { Carousel } from "./Carousel";

const PEEK_WIDTH = 48;
const VISIBLE_CARDS = 3;

interface CategoryData {
  id: string;
  icon: IconName;
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
  const focusedIndex = categories.findIndex((c) => c.id === selectedCategoryId);

  const handleFocusedIndexChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= categories.length) return;
      onCategorySelect(categories[index].id);
    },
    [categories, onCategorySelect]
  );

  return (
    <Carousel
      items={categories}
      peekWidth={PEEK_WIDTH}
      visibleCards={VISIBLE_CARDS}
      focusedIndex={focusedIndex}
      onFocusedIndexChange={handleFocusedIndexChange}
      renderItem={(category) => (
        <CategoryCard
          key={`category_${category.id}`}
          icon={category.icon}
          categoryColor={category.color}
          variant={selectedCategoryId === category.id ? "focused" : "unfocused"}
          title={category.name}
          subtitle={category.synonyms}
          description={category.description}
          explanationId={category.explanationId}
          onClick={() => onCategorySelect(category.id)}
        />
      )}
    />
  );
};
