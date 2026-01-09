import { useState, useCallback } from "react";

export const useEmissionCaptureCategory = (initialCategory = "1") => {
  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategory);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  return {
    selectedCategory,
    handleCategoryChange,
  };
};
