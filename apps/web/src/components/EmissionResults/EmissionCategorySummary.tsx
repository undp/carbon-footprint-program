import { FC } from "react";
import { Avatar, Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BarChartOutlined } from "@mui/icons-material";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import { getCategoryIconComponent } from "@/utils/categoryIcons";
import { deriveCategoryColors } from "@/utils/categoryColors";
import { EmissionSummaryCard } from "./EmissionSummaryCard";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { EmissionPercentageBadge } from "./EmissionPercentageBadge";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";

type CategoryData = GetEmissionsSummaryCategoriesResponse["categories"][number];

interface EmissionCategorySummaryProps {
  totalEmissions: number;
  categories: CategoryData[];
  isLoading?: boolean;
  hasError?: boolean;
}

export const EmissionCategorySummary: FC<EmissionCategorySummaryProps> = ({
  totalEmissions,
  categories,
  isLoading = false,
  hasError = false,
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

  if (hasError) {
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
        className="flex flex-1 shrink-0 items-center justify-between rounded-lg px-3 py-2"
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
        const categoryColors = deriveCategoryColors(category.color);
        const IconComponent = getCategoryIconComponent(category.icon);

        return (
          <EmissionSummaryCard
            key={category.id}
            icon={
              IconComponent ? (
                <IconComponent
                  sx={{
                    fill: categoryColors.dark,
                    width: "100%",
                    height: "100%",
                  }}
                />
              ) : null
            }
            title={`${category.name}:`}
            subtitle={category.synonyms ?? `Categoría ${category.position}`}
            value={category.subtotal}
            percentage={category.percentage}
            backgroundColor={categoryColors.light}
            textColor={categoryColors.dark}
            iconColor={categoryColors.main}
          />
        );
      })}
    </>
  );
};
