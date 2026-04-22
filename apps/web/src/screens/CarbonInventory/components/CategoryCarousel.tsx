import { FC, useCallback } from "react";
import { CategoryCard } from "./CategoryCard";
import { Carousel } from "@/components";
import type { MethodologyCategory } from "../types";

const PEEK_WIDTH = 48;
const VISIBLE_CARDS = 3;

interface CategoryCarouselProps {
  categories: Pick<
    MethodologyCategory,
    | "id"
    | "name"
    | "icon"
    | "color"
    | "synonyms"
    | "description"
    | "explanation"
  >[];
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
}

export const CategoryCarousel: FC<CategoryCarouselProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
}) => {
  const focusedIndex = categories.findIndex((c) => c.id === selectedCategoryId);

  const onFocusedIndexChange = useCallback(
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
      onFocusedIndexChange={onFocusedIndexChange}
      renderItem={(category) => (
        <CategoryCard
          icon={category.icon}
          categoryColor={category.color}
          variant={selectedCategoryId === category.id ? "focused" : "unfocused"}
          title={category.name}
          subtitle={category.synonyms}
          description={category.description}
          explanation={category.explanation}
          onClick={() => onCategorySelect(category.id)}
        />
      )}
    />
  );
};
