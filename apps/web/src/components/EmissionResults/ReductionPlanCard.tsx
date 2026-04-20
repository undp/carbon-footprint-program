import { FC } from "react";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AutoAwesome } from "@mui/icons-material";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";
import { VOCAB } from "@/config/vocab";
import { type GetSuggestedReductionPlanResponse } from "@repo/types";

interface ReductionPlanCardProps {
  initiatives: GetSuggestedReductionPlanResponse | null;
  onViewFullPlan: () => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const ReductionPlanCard: FC<ReductionPlanCardProps> = ({
  initiatives,
  onViewFullPlan,
  isLoading = false,
  hasError = false,
}) => {
  const theme = useTheme();

  const hasInitiatives = Array.isArray(initiatives) && initiatives.length > 0;

  return (
    <Box
      className="flex h-full min-h-0 w-full flex-col items-stretch gap-6 overflow-hidden rounded-lg p-4"
      sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
    >
      <Typography variant="body1" fontWeight="fontWeightMedium">
        Plan de reducción sugerido
      </Typography>

      <Box className="flex min-h-0 flex-1 flex-col">
        {isLoading && (
          <Box className="min-h-0 flex-1 overflow-y-auto">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="text"
                width={`${85 - i * 10}%`}
                height={20}
              />
            ))}
          </Box>
        )}

        {!isLoading && hasError && (
          <LoadingErrorStateMessage
            message={`Ocurrió un error al cargar el plan de reducción sugerida para tu ${VOCAB.organization.noun.singular}`}
          />
        )}

        {!isLoading && !hasError && !hasInitiatives && (
          <EmptyStateMessage
            message={`Cuando tengas completo el registro, se creará con inteligencia artificial un plan de reducción sugerido que puedes implementar en tu ${VOCAB.organization.noun.singular}`}
          />
        )}

        {!isLoading && !hasError && hasInitiatives && (
          <>
            <Box className="min-h-0 flex-1 overflow-y-auto">
              <Box component="ul" className="m-0 flex flex-col gap-3 p-0">
                {initiatives.map((initiative) => (
                  <Box
                    component="li"
                    key={initiative.id}
                    className="ml-[21px] list-disc"
                    sx={{ "::marker": { color: theme.palette.text.primary } }}
                  >
                    <Typography variant="body2" fontWeight="fontWeightSemiBold">
                      {initiative.title}
                    </Typography>
                    <Typography variant="body2">
                      {initiative.description}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Button
              variant="text"
              onClick={onViewFullPlan}
              endIcon={
                <AutoAwesome sx={{ color: theme.palette.other.fluor }} />
              }
              className="shrink-0 gap-4 self-center"
              sx={{ textTransform: "none" }}
            >
              <Typography
                variant="body1"
                fontWeight="fontWeightSemiBold"
                className="underline"
                sx={{
                  background: `linear-gradient(90deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Ver plan completo
              </Typography>
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};
