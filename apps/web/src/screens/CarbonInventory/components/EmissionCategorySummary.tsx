import { FC } from "react";
import { Avatar, Box, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChartOutlined } from "@mui/icons-material";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";
import { EmissionSummaryCard } from "./EmissionSummaryCard";
import { EmptyStateMessage } from "./EmptyStateMessage";

interface CategoryData {
  id: string;
  name: string;
  synonyms: string | null;
  position: number;
  subtotal: number;
  percentage: number;
}

interface EmissionCategorySummaryProps {
  totalEmissions: number;
  categories: CategoryData[];
}

const CATEGORY_ICONS: Record<number, FC<{ sx?: object }>> = {
  1: DirectEmissionCategoryIcon,
  2: IndirectEmissionCategoryIcon,
  3: OthersCategoryIcon,
};

const formatEmissions = (value: number): string =>
  `${value.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}  tCO₂e`;

const formatPercentage = (value: number): string =>
  `${(value * 100).toFixed(1).replace(".", ",")}%`;

export const EmissionCategorySummary: FC<EmissionCategorySummaryProps> = ({
  totalEmissions,
  categories,
}) => {
  const theme = useTheme();

  if (!categories.length) {
    return (
      <EmptyStateMessage message="Cuando registres tus actividades, verás aquí el total y desglose por categoría" />
    );
  }

  return (
    <>
      <Box
        className="flex shrink-0 items-center justify-between rounded-lg p-3"
        sx={{ backgroundColor: alpha(theme.palette.common.deepForest, 0.1) }}
      >
        <Box className="flex items-center gap-2">
          <Avatar
            sx={{
              width: 32,
              height: 32,
              backgroundColor: alpha(theme.palette.common.deepForest, 0.1),
            }}
          >
            <BarChartOutlined color="disabled" />
          </Avatar>
          <Typography
            variant="body1"
            fontWeight="fontWeightSemiBold"
            sx={{ color: theme.palette.common.deepForest }}
          >
            Total emisiones
          </Typography>
        </Box>
        <Typography
          variant="body1"
          fontWeight="fontWeightSemiBold"
          sx={{ color: theme.palette.common.deepForest }}
        >
          {formatEmissions(totalEmissions)}
        </Typography>
      </Box>

      {categories.map((category) => {
        const catKey = Math.min(category.position, 3) as 1 | 2 | 3;
        const Icon = CATEGORY_ICONS[catKey] ?? OthersCategoryIcon;

        return (
          <EmissionSummaryCard
            key={category.id}
            icon={
              <Icon
                sx={{
                  fill: theme.palette.category[catKey].dark,
                  width: "100%",
                  height: "100%",
                }}
              />
            }
            title={`${category.name}:`}
            subtitle={category.synonyms ?? `Categoría ${category.position}`}
            value={formatEmissions(category.subtotal)}
            percentage={formatPercentage(category.percentage)}
            backgroundColor={theme.palette.category[catKey].light}
            textColor={theme.palette.category[catKey].dark}
            iconColor={theme.palette.category[catKey].main}
          />
        );
      })}
    </>
  );
};
