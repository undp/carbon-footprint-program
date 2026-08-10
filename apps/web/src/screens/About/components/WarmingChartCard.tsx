import { FC } from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import { WARMING_CHART } from "../constants";

/** Alto del área de barras del gráfico, en píxeles. */
const CHART_HEIGHT = 184;
/** Alto de la barra más alta, en píxeles. */
const TALLEST_BAR_HEIGHT = 132;

/**
 * Tarjeta de "El desafío" que compara el calentamiento proyectado con los
 * compromisos actuales contra la meta del Acuerdo de París.
 */
export const WarmingChartCard: FC = () => {
  const theme = useTheme();

  const barGradients = [
    `linear-gradient(180deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
    `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.common.mint} 100%)`,
  ];
  const valueColors = [
    theme.palette.warning.dark,
    theme.palette.common.deepForest,
  ];

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
        {WARMING_CHART.scenarios.map((scenario, index) => (
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
                color: valueColors[index],
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
                background: barGradients[index],
              }}
            />
          </Box>
        ))}
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
