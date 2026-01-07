import { FC, Fragment } from "react";
import { Box, Divider } from "@mui/material";
import { CategoryCard } from "./CategoryCard";
import { SubcategoryField } from "./SubcategoryPreselectionCardField";
import { CategoryWithSubcategories } from "../types";

interface SubcategoryPreselectionCardProps {
  category: CategoryWithSubcategories;
}

export const SubcategoryPreselectionCard: FC<
  SubcategoryPreselectionCardProps
> = ({ category }) => {
  return (
    <Box
      className="flex min-w-[300px] flex-1 flex-col items-start gap-4 overflow-hidden p-4"
      sx={{
        border: `1px solid #ECECEC`,
        borderRadius: `16px`,
      }}
    >
      {/* Header */}
      <CategoryCard
        position={category.position as 1 | 2 | 3}
        subtitle={category.synonyms || ""}
        title={category.name}
        description={category.description || ""}
      />
      {/*  Body */}
      <Divider className="w-full" />

      <Box className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto">
        {category.subcategories.map((subcategory) => (
          <Fragment key={subcategory.id}>
            <SubcategoryField
              name={String(subcategory.id)}
              emission={{
                id: subcategory.id,
                name: subcategory.name,
                description: subcategory.description,
              }}
              disabled={subcategory.edited}
            />
            <Divider className="w-full" />
          </Fragment>
        ))}
        {category.subcategories.length === 0 && (
          <Box className="p-4 text-center text-gray-500">
            No hay subcategorías disponibles.
          </Box>
        )}
      </Box>
    </Box>
  );
};
