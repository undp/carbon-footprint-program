import {
  alpha,
  Avatar,
  Box,
  Card,
  darken,
  SvgIconProps,
  Typography,
} from "@mui/material";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import React from "react";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";
import { useEmissionCategoryTotal } from "./EmissionEditor/hooks/useEmissionCategoryTotal";
import { formatEmissions } from "@/utils/formatting";
import { kgToTon } from "@repo/utils";

const ICONS_PER_CATEGORY_POSITION: Record<number, React.FC<SvgIconProps>> = {
  1: DirectEmissionCategoryIcon,
  2: IndirectEmissionCategoryIcon,
  3: OthersCategoryIcon,
};

interface Props {
  category: GetCarbonInventoryMethodologyResponse["categories"][number];
}

export const TotalCategoryEmissionCard: React.FC<Props> = ({ category }) => {
  const IconComponent =
    ICONS_PER_CATEGORY_POSITION[category.position] ?? OthersCategoryIcon;

  const totalEmissions = useEmissionCategoryTotal(category.id);

  return (
    <Box className="flex">
      <Card
        className="flex h-16 w-full flex-row items-center justify-center p-2"
        sx={(theme) => ({
          backgroundColor: theme.palette.category[Number(category.id)].light,
        })}
        elevation={0}
      >
        <Box className="justify-left flex flex-1 items-center gap-2">
          <Avatar
            sx={(theme) => ({
              backgroundColor: alpha(
                theme.palette.category[Number(category.id)].main,
                0.3
              ),
            })}
          >
            <IconComponent
              sx={(theme) => ({
                fill: darken(
                  theme.palette.category[category.position].main,
                  0.6
                ),
              })}
            />
          </Avatar>
          <Typography variant="subtitle1" fontWeight="medium">
            Total {category.name.toLowerCase()}:{" "}
          </Typography>
        </Box>
        <Box className="justify-left flex flex-1 items-center">
          <Typography variant="subtitle1" fontWeight="bold">
            {formatEmissions(kgToTon(totalEmissions ?? 0))}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
