import { FC } from "react";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AutoAwesome } from "@mui/icons-material";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";

interface ReductionPlanCardProps {
  mainGoal: string | null;
  actions: string[] | null;
  onViewFullPlan: () => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const ReductionPlanCard: FC<ReductionPlanCardProps> = ({
  mainGoal,
  actions,
  onViewFullPlan,
  isLoading = false,
  hasError = false,
}) => {
  const theme = useTheme();

  const existsPlan = !!mainGoal || !!actions;

  return (
    <Box
      className="flex h-full min-h-0 w-full flex-col items-start justify-between gap-4 overflow-hidden rounded-lg p-4"
      sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
    >
      <Box className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto">
        <Typography variant="body1" fontWeight="fontWeightMedium">
          Plan de reducción sugerido
        </Typography>

        {isLoading && (
          <>
            <Skeleton
              variant="rounded"
              height={72}
              sx={{ borderRadius: 1, width: "100%" }}
            />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="text"
                width={`${85 - i * 10}%`}
                height={20}
              />
            ))}
          </>
        )}

        {!isLoading && !hasError && mainGoal != null && mainGoal !== "" && (
          <Box
            className="flex w-full items-center justify-center rounded px-2 py-4"
            sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
          >
            <Typography variant="body2" className="whitespace-pre-wrap">
              {mainGoal}
            </Typography>
          </Box>
        )}

        {!isLoading &&
          !hasError &&
          Array.isArray(actions) &&
          actions.length > 0 && (
            <Box component="ul" className="m-0 flex flex-col gap-2 p-0">
              {actions.map((action, index) => (
                <Box
                  component="li"
                  key={index}
                  className="ml-[21px] list-disc"
                  sx={{ "::marker": { color: theme.palette.text.primary } }}
                >
                  <Typography variant="body2">{action}</Typography>
                </Box>
              ))}
            </Box>
          )}

        {!isLoading && !hasError && existsPlan && (
          <Button
            variant="text"
            onClick={onViewFullPlan}
            endIcon={<AutoAwesome sx={{ color: theme.palette.other.fluor }} />}
            className="gap-4 self-center"
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
        )}
      </Box>

      {!isLoading && hasError && (
        <LoadingErrorStateMessage
          message={
            "Ocurrió un error al cargar el plan de reducción sugerido para tu empresa"
          }
        />
      )}

      {!isLoading && !hasError && !existsPlan && (
        <EmptyStateMessage
          message={
            "Cuando tengas completo el registro, se creará con inteligencia artificial un plan de reducción sugerido que puedes implementar en tu empresa"
          }
        />
      )}
    </Box>
  );
};
