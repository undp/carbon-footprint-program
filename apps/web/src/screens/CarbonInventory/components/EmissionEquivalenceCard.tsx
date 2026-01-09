import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Folder } from "@mui/icons-material";
// import { PackageIcon } from "lucide-react";

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
      className="flex h-full w-full flex-col items-start justify-between gap-6 rounded-lg p-4"
      sx={{ background: gradient }}
    >
      <Typography
        variant="body1"
        fontWeight="fontWeightMedium"
        sx={{ color: theme.palette.primary.main }}
      >
        Tu huella de carbono equivale
      </Typography>

      <Box className="flex w-full flex-col">
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

      <Box className="flex w-full items-end justify-end">
        <Folder
          className="size-16"
          strokeWidth={1}
          style={{ color: alpha(theme.palette.primary.main, 0.3) }}
        />
      </Box>
    </Box>
  );
};
