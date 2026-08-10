import { FC } from "react";
import { alpha, Box, Chip, Typography, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

interface Props {
  Icon: SvgIconComponent;
  title: string;
  /** Contador opcional a la derecha del título (p. ej. "16 personas"). */
  badge?: string;
}

/**
 * Título de sección de las pantallas públicas: ícono en un círculo verde
 * claro, título y, opcionalmente, un contador.
 */
export const SectionHeading: FC<Props> = ({ Icon, title, badge }) => {
  const theme = useTheme();

  return (
    <Box className="mb-5 flex flex-wrap items-center gap-3.5">
      <Box
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.12) }}
      >
        <Icon sx={{ fontSize: 20, color: theme.palette.primary.dark }} />
      </Box>
      <Typography
        variant="h5"
        component="h2"
        fontWeight="fontWeightBold"
        sx={{ color: theme.palette.common.deepForestDark }}
      >
        {title}
      </Typography>
      {badge && (
        <Chip
          label={badge}
          size="small"
          sx={{
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.dark,
            fontWeight: "fontWeightBold",
            fontSize: 11.5,
          }}
        />
      )}
    </Box>
  );
};
