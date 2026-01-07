import { alpha, Avatar, Box, Card, darken, Typography } from "@mui/material";
import { round } from "lodash";

import { Category } from "@repo/types";
import React, { FC, useMemo } from "react";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";

interface Props {
  category: Category;
  categoryEmissions: number | null;
}

export const TotalCategoryEmissionCard: FC<Props> = ({
  category,
  categoryEmissions,
}) => {
  const icons: Record<number, React.ReactNode> = useMemo(
    () => ({
      1: (
        <DirectEmissionCategoryIcon
          sx={(theme) => ({
            fill: darken(theme.palette.category[1].main, 0.6),
          })}
        />
      ),
      2: (
        <IndirectEmissionCategoryIcon
          sx={(theme) => ({
            fill: darken(theme.palette.category[2].main, 0.6),
          })}
        />
      ),
      3: (
        <OthersCategoryIcon
          sx={(theme) => ({
            fill: darken(theme.palette.category[3].main, 0.6),
          })}
        />
      ),
    }),
    []
  );

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
            {icons[Number(category.id)]}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="medium">
            Total {category.name.toLowerCase()}:{" "}
          </Typography>
        </Box>
        <Box className="justify-left flex flex-1 items-center">
          <Typography variant="subtitle1" fontWeight="bold">
            {round(categoryEmissions ?? 0, 2)} tCO₂e
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
