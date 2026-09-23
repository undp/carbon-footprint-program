import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { EmissionResultsScreenTrashIcon } from "@/icons";
import { InfoButton } from "../InfoButton";
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
      <Box className="flex w-full items-center gap-1">
        <Typography
          variant="body1"
          fontWeight="fontWeightMedium"
          sx={{ color: theme.palette.primary.main }}
        >
          Tu indicador de intensidad es
        </Typography>
        <InfoButton
          color="primary"
          // `label` is the tooltip; without an explicit short name a screen
          // reader would announce the whole paragraph as the button's name.
          aria-label="Más información sobre el indicador de intensidad"
          sx={{ flexShrink: 0 }}
          label={`Relaciona tus emisiones totales con la actividad principal que declaraste. Sirve para comparar tu desempeño entre un año y otro aunque tu ${VOCAB.organization.noun.singular} haya crecido.`}
        />
      </Box>

      {isLoading && (
        <Box className="flex w-full flex-1 flex-col justify-center gap-1 pb-3">
          <Skeleton variant="text" width="40%" height={56} />
          <Skeleton variant="text" width="60%" height={24} />
        </Box>
      )}

      {!isLoading && hasError && (
        <LoadingErrorStateMessage message="Ocurrió un error al cargar tu indicador de intensidad" />
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
          message={`Aquí verás tu indicador de intensidad según la actividad principal de tu ${VOCAB.organization.noun.singular}`}
        />
      )}
    </Box>
  );
};
