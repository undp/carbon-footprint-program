import { FC, ReactNode } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import { CheckRounded } from "@mui/icons-material";

export type OnboardingStepState = "done" | "active" | "locked";

interface StepTag {
  label: string;
  variant: "next" | "ok" | "wait";
}

interface Props {
  index: number;
  state: OnboardingStepState;
  title: string;
  description: string;
  tag?: StepTag;
  action?: ReactNode;
  children?: ReactNode;
}

export const OnboardingStep: FC<Props> = ({
  index,
  state,
  title,
  description,
  tag,
  action,
  children,
}) => {
  const theme = useTheme();

  const circleSx =
    state === "active"
      ? { bgcolor: "primary.main", color: "common.white" }
      : state === "done"
        ? {
            bgcolor: alpha(theme.palette.success.main, 0.15),
            color: "success.main",
          }
        : { bgcolor: "grey.100", color: "text.disabled" };

  const tagSx: Record<StepTag["variant"], object> = {
    next: {
      color: "primary.main",
      bgcolor: alpha(theme.palette.primary.main, 0.12),
    },
    ok: {
      color: "success.main",
      bgcolor: alpha(theme.palette.success.main, 0.14),
    },
    wait: { color: "text.disabled", bgcolor: "grey.100" },
  };

  return (
    <Box
      className="flex items-start gap-4 rounded-xl p-5"
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: state === "active" ? "primary.main" : "divider",
        boxShadow: state === "active" ? 3 : 0,
        opacity: state === "locked" ? 0.6 : 1,
      }}
    >
      <Box
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        sx={circleSx}
      >
        {state === "done" ? <CheckRounded fontSize="small" /> : index}
      </Box>

      <Box className="min-w-0 flex-1">
        <Box className="flex flex-wrap items-center gap-2">
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            {title}
          </Typography>
          {tag && (
            <Box
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
              sx={tagSx[tag.variant]}
            >
              {tag.label}
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
        {children}
      </Box>

      {action && <Box className="self-center">{action}</Box>}
    </Box>
  );
};
