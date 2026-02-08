import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { EmissionResultsScreenTrashIcon } from "@/icons";

interface EmissionEquivalenceCardProps {
  value: string;
  unit: string;
}

export const EmissionEquivalenceCard: FC<EmissionEquivalenceCardProps> = ({
  value,
  unit,
}) => {
  const theme = useTheme();

  const gradient = `linear-gradient(90deg, ${alpha(
    theme.palette.common.brightGreen,
    0.2
  )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`;

  return (
    <Box
      className="relative flex h-full w-full flex-col items-start overflow-hidden rounded-lg p-4"
      sx={{ background: gradient }}
    >
      <Typography
        variant="body1"
        fontWeight="fontWeightMedium"
        sx={{ color: theme.palette.primary.main }}
      >
        Tu huella de carbono equivale
      </Typography>

      <Box className="flex w-full flex-1 flex-col justify-center pb-3">
        <Typography
          variant="h2"
          fontWeight="fontWeightBold"
          sx={{ color: theme.palette.primary.main }}
        >
          {value}
        </Typography>
        <Typography
          variant="body1"
          fontWeight="fontWeightBold"
          sx={{ color: theme.palette.primary.main }}
        >
          {unit}
        </Typography>
      </Box>

      <EmissionResultsScreenTrashIcon
        sx={{ fontSize: 80, position: "absolute", bottom: 8, right: 8 }}
      />
    </Box>
  );
};
