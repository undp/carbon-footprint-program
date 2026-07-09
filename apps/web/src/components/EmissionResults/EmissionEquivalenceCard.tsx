import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { EmissionResultsScreenTrashIcon } from "@/icons";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { LoadingErrorStateMessage } from "./LoadingErrorStateMessage";
import { VOCAB } from "@/config/vocab";
import { OverflowTooltipText } from "../OverflowTooltipText";

interface EmissionEquivalenceCardProps {
  value: string | null;
  unit: string | null;
  isLoading?: boolean;
  hasError?: boolean;
}

export const EmissionEquivalenceCard: FC<EmissionEquivalenceCardProps> = ({
  value,
  unit,
  isLoading = false,
  hasError = false,
}) => {
  const theme = useTheme();

  const exists = value !== null && unit !== null;

  const gradient = `linear-gradient(90deg, ${alpha(
    theme.palette.common.brightGreen,
    0.2
  )} 0%, ${alpha(theme.palette.secondary.main, 0.2)} 100%)`;

  return (
    <Box
      className="relative flex h-full w-full flex-col items-start gap-4 overflow-hidden rounded-lg p-4"
      sx={{ background: gradient }}
    >
      <Typography
        variant="body1"
        fontWeight="fontWeightMedium"
        sx={{ color: theme.palette.primary.main }}
      >
        Tu huella de carbono equivale
      </Typography>

      {isLoading && (
        <Box className="flex w-full flex-1 flex-col justify-center gap-1 pb-3">
          <Skeleton variant="text" width="40%" height={56} />
          <Skeleton variant="text" width="60%" height={24} />
        </Box>
      )}

      {!isLoading && hasError && (
        <LoadingErrorStateMessage message="Ocurrió un error al cargar el equivalente de tu huella de carbono" />
      )}

      {!isLoading && !hasError && exists && (
        <Box className="flex w-full flex-1 flex-col justify-center pb-3">
          <OverflowTooltipText
            fontWeight="fontWeightBold"
            noWrap
            sx={{
              color: theme.palette.primary.main,
              fontSize: { md: "3rem", xl: "4rem" },
              lineHeight: 1.2,
            }}
          >
            {value}
          </OverflowTooltipText>
          <Typography
            variant="body1"
            fontWeight="fontWeightBold"
            sx={{
              color: theme.palette.primary.main,
              pr: { xl: 16 },
            }}
          >
            {unit}
          </Typography>
        </Box>
      )}

      {!isLoading && exists && (
        <EmissionResultsScreenTrashIcon
          sx={{
            fontSize: { xs: 0, md: 40, xl: 80 },
            position: "absolute",
            bottom: 8,
            right: 8,
            pointerEvents: "none",
          }}
        />
      )}

      {!isLoading && !exists && !hasError && (
        <EmptyStateMessage
          color="primary"
          message={`Aquí verás el equivalente de tu huella de carbono con la actividad principal de tu ${VOCAB.organization.noun.singular}`}
        />
      )}
    </Box>
  );
};
