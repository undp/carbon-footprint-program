import { FC } from "react";
import { Avatar, Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChartOutlined } from "@mui/icons-material";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";
import { EmissionSummaryCard } from "./EmissionSummaryCard";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { EmissionPercentageBadge } from "./emissionSummary/EmissionPercentageBadge";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";

type CategoryData = GetEmissionsSummaryCategoriesResponse["categories"][number];

interface EmissionCategorySummaryProps {
  totalEmissions: number;
  categories: CategoryData[];
  isLoading?: boolean;
  errorLoading?: boolean;
}

const CATEGORY_ICONS: Record<number, FC<{ sx?: object }>> = {
  1: DirectEmissionCategoryIcon,
  2: IndirectEmissionCategoryIcon,
  3: OthersCategoryIcon,
};

export const EmissionCategorySummary: FC<EmissionCategorySummaryProps> = ({
  totalEmissions,
  categories,
  isLoading = false,
  errorLoading = false,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <>
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ borderRadius: 2, flexShrink: 0, flex: 1 }}
        />
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={64}
            sx={{ borderRadius: 2, flexShrink: 0, flex: 1 }}
          />
        ))}
      </>
    );
  }

  if (errorLoading) {
    return (
      <LoadingErrorStateMessage message="Ocurrió un error al cargar el desglose por categoría" />
    );
  }

  if (!totalEmissions) {
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
        <EmissionPercentageBadge
          emissions={totalEmissions}
          categoryColor={{
            dark: theme.palette.common.deepForest,
          }}
        />
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
            value={category.subtotal}
            percentage={category.percentage}
            backgroundColor={theme.palette.category[catKey].light}
            textColor={theme.palette.category[catKey].dark}
            iconColor={theme.palette.category[catKey].main}
          />
        );
      })}
    </>
  );
};
