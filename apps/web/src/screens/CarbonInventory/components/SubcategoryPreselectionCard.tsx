import { FC, Fragment, ReactNode } from "react";
import { Box, Divider } from "@mui/material";
import { CategoryCard } from "./CategoryCard";
import { SubcategoryField } from "./SubcategoryPreselectionCardField";
import {
  CategoryWithSubcategories,
  SubcategoryItem,
} from "../hooks/types";

interface SubcategoryPreselectionCardProps {
  category: CategoryWithSubcategories;
  icon: ReactNode;
  label: string;
  color: string;
}

export const SubcategoryPreselectionCard: FC<
  SubcategoryPreselectionCardProps
> = ({ category, icon, label, color }) => {
  return (
    <Box
      className="flex flex-col flex-1 min-w-[300px] items-start p-4 gap-4 overflow-hidden"
      sx={{
        border: `1px solid #ECECEC`,
        borderRadius: `16px`,
      }}
    >
      {/* Header */}
      <CategoryCard
        icon={icon}
        subtitle={category.synonyms || label}
        title={category.name}
        description={category.description}
        color={color}
      />
      {/*  Body */}
      <Divider className="w-full" />

      <Box className="flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto w-full">
        {category.subcategories.map((sub: SubcategoryItem) => (
          <Fragment key={sub.id}>
            <SubcategoryField
              name={String(sub.id)}
              emission={{
                id: sub.id,
                name: sub.name,
                description: sub.description,
              }}
              disabled={sub.disabled}
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
