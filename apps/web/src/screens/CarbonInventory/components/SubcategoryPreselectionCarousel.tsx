import { FC, useCallback, useState } from "react";
import { SubcategoryPreselectionCard } from "./SubcategoryPreselectionCard";
import { Carousel } from "./Carousel";
import type { SubcategoryPreselectionMergedData } from "../types";

const PEEK_WIDTH = 96;
const VISIBLE_CARDS = 2;
const CAROUSEL_THRESHOLD = 3;

interface SubcategoryPreselectionCarouselProps {
  categories: SubcategoryPreselectionMergedData;
}

export const SubcategoryPreselectionCarousel: FC<
  SubcategoryPreselectionCarouselProps
> = ({ categories }) => {
  const [focusedCategoryId, setFocusedCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );

  // If the focused category no longer exists in the list, fall back to the first one
  const resolvedFocusedId =
    categories.length > 0 && !categories.some((c) => c.id === focusedCategoryId)
      ? categories[0].id
      : focusedCategoryId;

  const focusedIndex = categories.findIndex((c) => c.id === resolvedFocusedId);

  const handleBoxClick = useCallback((categoryId: string) => {
    setFocusedCategoryId(categoryId);
  }, []);

  const handleFocusedIndexChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= categories.length) return;
      setFocusedCategoryId(categories[index].id);
    },
    [categories]
  );

  return (
    <Carousel
      items={categories}
      peekWidth={PEEK_WIDTH}
      visibleCards={VISIBLE_CARDS}
      carouselThreshold={CAROUSEL_THRESHOLD}
      focusedIndex={focusedIndex}
      onFocusedIndexChange={handleFocusedIndexChange}
      fallbackClassName="flex min-h-0 flex-1 flex-row items-stretch gap-4 overflow-x-auto"
      carouselSx={{ alignItems: "stretch", minHeight: 0, flex: 1 }}
      renderItem={(category, _index, isCarousel) =>
        isCarousel ? (
          <SubcategoryPreselectionCard
            category={category}
            variant={
              resolvedFocusedId === category.id ? "focused" : "unfocused"
            }
            onClick={() => handleBoxClick(category.id)}
          />
        ) : (
          <SubcategoryPreselectionCard category={category} variant="default" />
        )
      }
    />
  );
};
