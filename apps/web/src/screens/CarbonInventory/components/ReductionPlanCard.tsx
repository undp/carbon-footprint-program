import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { AutoAwesome } from "@mui/icons-material";
import { EmptyStateMessage } from "./EmptyStateMessage";

interface ReductionPlanCardProps {
  mainGoal: string | null;
  actions: string[] | null;
  onViewFullPlan: () => void;
}

export const ReductionPlanCard: FC<ReductionPlanCardProps> = ({
  mainGoal,
  actions,
  onViewFullPlan,
}) => {
  const theme = useTheme();

  const existsPlan = !!mainGoal || !!actions;

  return (
    <Box
      className="flex h-full min-h-0 w-full flex-col items-start justify-between gap-4 overflow-hidden rounded-lg p-4"
      sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
    >
      <Box className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <Typography variant="body1" fontWeight="fontWeightMedium">
          Plan de reducción sugerido
        </Typography>

        {existsPlan && (
          <Box
            className="flex w-full items-center justify-center rounded px-2 py-4"
            sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
          >
            <Typography variant="body2" className="whitespace-pre-wrap">
              {mainGoal}
            </Typography>
          </Box>
        )}

        {existsPlan && (
          <Box component="ul" className="m-0 flex flex-col gap-2 p-0">
            {actions?.map((action, index) => (
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
      </Box>
      {!existsPlan && (
        <EmptyStateMessage
          message={
            "Cuando tengas completo el registro, se creará con inteligencia artificial un plan de reducción sugerido que puedes implementar en tu empresa"
          }
        />
      )}

      {existsPlan && (
        <Button
          variant="text"
          onClick={onViewFullPlan}
          endIcon={<AutoAwesome sx={{ color: "#63E4CF" }} />}
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
  );
};
