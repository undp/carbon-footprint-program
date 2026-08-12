import { FC } from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { WARMING_CHART, type WarmingScenarioTone } from "../constants";

/** Height of the chart's bar area, in pixels. */
const CHART_HEIGHT = 184;
/** Height of the tallest bar, in pixels. */
const TALLEST_BAR_HEIGHT = 132;

/**
 * "El desafío" card comparing projected warming under current commitments
 * against the Paris Agreement's target.
 */
export const WarmingChartCard: FC = () => {
  const theme = useTheme();

  const toneStyles: Record<
    WarmingScenarioTone,
    { barGradient: string; valueColor: string }
  > = {
    current: {
      barGradient: `linear-gradient(180deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
      valueColor: theme.palette.warning.dark,
    },
    target: {
      barGradient: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.common.mint} 100%)`,
      valueColor: theme.palette.common.deepForest,
    },
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        px: 3.75,
        py: 3.5,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 10.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: theme.palette.primary.main,
          mb: 0.5,
        }}
      >
        {WARMING_CHART.overline}
      </Typography>
      <Typography
        variant="subtitle1"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{
          fontSize: 17,
          color: theme.palette.common.deepForestDark,
          mb: 2.75,
        }}
      >
        {WARMING_CHART.title}
      </Typography>

      <Box className="flex items-end gap-6" sx={{ height: CHART_HEIGHT }}>
        {WARMING_CHART.scenarios.map((scenario) => {
          const { barGradient, valueColor } = toneStyles[scenario.tone];

          return (
            <Box
              key={scenario.value}
              className="flex h-full flex-1 flex-col items-center justify-end"
            >
              <Typography
                component="b"
                sx={{
                  fontSize: 30,
                  fontWeight: "fontWeightBold",
                  letterSpacing: "-1.2px",
                  lineHeight: 1,
                  mb: 1.25,
                  color: valueColor,
                }}
              >
                {scenario.value}
              </Typography>
              <Box
                aria-hidden
                sx={{
                  width: "100%",
                  height: TALLEST_BAR_HEIGHT * scenario.barRatio,
                  borderRadius: "10px 10px 0 0",
                  background: barGradient,
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Box
        className="flex gap-6"
        sx={{
          borderTop: `2px solid ${theme.palette.divider}`,
          pt: 1.25,
          mb: 2,
        }}
      >
        {WARMING_CHART.scenarios.map((scenario) => (
          <Typography
            key={scenario.caption}
            component="span"
            color="text.secondary"
            sx={{
              flex: 1,
              textAlign: "center",
              fontSize: 11.5,
              fontWeight: "fontWeightMedium",
              lineHeight: 1.4,
            }}
          >
            {scenario.caption}
          </Typography>
        ))}
      </Box>

      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 14, lineHeight: 1.7, mt: "auto" }}
      >
        {WARMING_CHART.footnote}
      </Typography>
    </Paper>
  );
};
