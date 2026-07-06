import { FC } from "react";
import {
  Box,
  LinearProgress,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { LatamFootprintIcon } from "@/icons";

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** 0–100. When provided, renders a progress bar with `progressLabel`. */
  progress?: number;
  progressLabel?: string;
}

export const WelcomeHero: FC<Props> = ({
  eyebrow,
  title,
  subtitle,
  progress,
  progressLabel,
}) => {
  const theme = useTheme();
  const forest = theme.palette.common.deepForest;

  return (
    <Box
      className="relative overflow-hidden rounded-2xl p-6 md:p-8"
      sx={{ background: theme.palette.other.gradient, color: "common.white" }}
    >
      {/* Deep-forest scrim over the bright aqua gradient, strongest under the
          text column, so the white copy keeps a legible contrast throughout. */}
      <Box
        className="pointer-events-none absolute inset-0"
        sx={{
          background: `linear-gradient(90deg, ${alpha(forest, 0.72)} 0%, ${alpha(forest, 0.55)} 60%, ${alpha(forest, 0.4)} 100%)`,
        }}
      />
      <LatamFootprintIcon
        className="pointer-events-none absolute top-1/2 right-[-40px] -translate-y-1/2"
        sx={{ width: 360, height: 314, opacity: 0.12, color: "common.white" }}
      />

      <Box
        className="relative min-w-0"
        sx={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.28)" }}
      >
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.14em", opacity: 0.9 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
          {title}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, maxWidth: "52ch" }}>
          {subtitle}
        </Typography>

        {progress !== undefined && (
          <Box className="mt-5 flex items-center gap-3">
            <LinearProgress
              variant="determinate"
              value={progress}
              className="flex-1"
              sx={{
                height: 7,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.common.white, 0.32),
                "& .MuiLinearProgress-bar": {
                  bgcolor: "common.white",
                  borderRadius: 999,
                },
              }}
            />
            {progressLabel && (
              <Typography
                variant="caption"
                fontWeight={600}
                className="whitespace-nowrap"
              >
                {progressLabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
