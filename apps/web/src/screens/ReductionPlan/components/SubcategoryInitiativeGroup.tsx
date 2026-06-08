import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { GetReductionPlanResponse } from "@repo/types";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { getColorPalette } from "@/utils/categoryColors";
import { InitiativeCard } from "./InitiativeCard";

type Subcategory =
  GetReductionPlanResponse["categories"][number]["subcategories"][number];

interface SubcategoryInitiativeGroupProps extends Pick<
  Subcategory,
  "name" | "icon" | "description" | "initiatives"
> {
  categoryColor: string;
}

export const SubcategoryInitiativeGroup: FC<
  SubcategoryInitiativeGroupProps
> = ({ name, icon, description, initiatives, categoryColor }) => {
  const IconComponent = CATEGORY_ICON_MAP[icon];
  const categoryColorPalette = getColorPalette(categoryColor);

  return (
    <Box
      className="flex flex-col gap-2 rounded-lg p-4"
      sx={{
        backgroundColor: "rgba(65,64,70,0.03)",
        border: `1px solid ${categoryColorPalette.main}`,
        boxShadow: `0px 1px 4px ${categoryColorPalette.light}`,
      }}
    >
      {/* Subcategory header */}
      <Box className="flex items-center gap-2">
        <Box
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          sx={{
            backgroundColor: `${categoryColorPalette.light}`,
            "& svg": { width: "60%", height: "60%" },
          }}
        >
          {IconComponent && (
            <IconComponent
              sx={{ fill: categoryColorPalette.dark, opacity: 0.6 }}
            />
          )}
        </Box>
        <Box className="flex flex-col gap-1">
          <Typography variant="body1" fontWeight="medium" color="text.primary">
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>

      {/* Initiative cards */}
      {initiatives.map((initiative) => (
        <InitiativeCard
          key={initiative.id}
          title={initiative.title}
          description={initiative.description}
        />
      ))}
    </Box>
  );
};
