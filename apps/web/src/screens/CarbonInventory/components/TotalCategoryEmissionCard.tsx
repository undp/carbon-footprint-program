import { Avatar, Box, Card, Typography } from "@mui/material";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import React from "react";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { getColorPalette } from "@/utils/categoryColors";
import { useEmissionCategoryTotal } from "./EmissionEditor/hooks/useEmissionCategoryTotal";
import { formatter } from "@/utils/formatting";
import { kgToTon } from "@repo/utils";

interface Props {
  category: GetCarbonInventoryMethodologyResponse["categories"][number];
}

export const TotalCategoryEmissionCard: React.FC<Props> = ({ category }) => {
  const IconComponent = CATEGORY_ICON_MAP[category.icon];
  const categoryColorPalette = getColorPalette(category.color);
  const totalEmissions = useEmissionCategoryTotal(category.id);

  return (
    <Box className="flex">
      <Card
        className="flex h-16 w-full flex-row items-center justify-center p-2"
        sx={{ backgroundColor: categoryColorPalette.light }}
        elevation={0}
      >
        <Box className="justify-left flex flex-1 items-center gap-2">
          <Avatar
            sx={{
              backgroundColor: categoryColorPalette.light,
            }}
          >
            {IconComponent && (
              <IconComponent sx={{ fill: categoryColorPalette.dark }} />
            )}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="medium">
            Total {category.name.toLowerCase()}:{" "}
          </Typography>
        </Box>
        <Box className="justify-left flex flex-1 items-center">
          <Typography variant="subtitle1" fontWeight="bold">
            {formatter.emissions(kgToTon(totalEmissions ?? 0))}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
