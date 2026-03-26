import { FC, Fragment, MouseEvent } from "react";
import { Box, Divider } from "@mui/material";
import { CategoryCard } from "./CategoryCard";
import { SubcategoryPreselectionField } from "./SubcategoryPreselectionField";
import type { SubcategoryPreselectionMergedData } from "../types";
import { getColorPalette } from "@/utils/categoryColors";

interface SubcategoryPreselectionCardProps {
  category: SubcategoryPreselectionMergedData[number];
  isFocused: boolean;
  isCarousel: boolean;
  onClick?: (e: MouseEvent) => void;
}

export const SubcategoryPreselectionCard: FC<
  SubcategoryPreselectionCardProps
> = ({ category, isFocused, isCarousel, onClick }) => {
  const palette = getColorPalette(category.color);

  return (
    <Box
      onClick={onClick}
      className="flex flex-col items-start overflow-hidden p-4"
      sx={{
        border:
          isCarousel && isFocused
            ? `2px solid ${palette.main}`
            : `2px solid #ECECEC`,
        borderRadius: "16px",
        height: "100%",
        opacity: isCarousel && !isFocused ? 0.5 : 1,
        boxShadow: isCarousel && isFocused ? 2 : 0,
        transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
        cursor: isCarousel ? "pointer" : "default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "start",
          width: "100%",
          minHeight: 0,
          flex: 1,
          pointerEvents: isCarousel && !isFocused ? "none" : "auto",
        }}
      >
        <CategoryCard
          icon={category.icon}
          categoryColor={category.color}
          subtitle={category.synonyms || ""}
          title={category.name}
          description={category.description || ""}
          explanationId={category.explanationId}
        />
        <Divider className="w-full pt-4" />
        <Box className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
          {category.subcategories.map((subcategory) => (
            <Fragment key={subcategory.id}>
              <SubcategoryPreselectionField
                subcategory={subcategory}
                disabled={isCarousel && !isFocused}
              />
              <Divider className="w-full" />
            </Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
