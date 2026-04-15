import { FC } from "react";
import { Box, Skeleton, Typography, alpha, useTheme } from "@mui/material";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { EmissionResultsScreenTrashIcon } from "@/icons";
import { LoadingErrorStateMessage } from "../LoadingErrorStateMessage";
import { EmptyStateMessage } from "../EmptyStateMessage";
import { formatQuantity } from "@/utils/formatting";
import { VOCAB } from "@/config/vocab";

interface InventoryAttributesCardProps {
  data: GetCarbonInventoryMetadataResponse | undefined;
  isLoading: boolean;
  hasError?: boolean;
}

export const InventoryAttributesCard: FC<InventoryAttributesCardProps> = ({
  data,
  isLoading,
  hasError = false,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={124}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  if (hasError) {
    return (
      <LoadingErrorStateMessage
        message="Ocurrió un error al cargar la información de la huella"
        className="max-h-[120px]"
      />
    );
  }

  if (!data) {
    return (
      <EmptyStateMessage
        message="No se encontró la información de la huella"
        className="max-h-[120px]"
      />
    );
  }

  return (
    <Box
      className="flex gap-6 rounded-lg p-4"
      sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.03) }}
    >
      {/* Left column */}
      <Box className="flex flex-1 flex-col gap-1">
        <AttributeRow
          label={`Nombre ${VOCAB.organization.noun.singular}`}
          value={data.organizationName}
        />
        <AttributeRow label="País" value={data.country} />
        <AttributeRow label="Rubro" value={data.organizationSectorName} />
      </Box>

      {/* Middle column */}
      <Box className="flex flex-1 flex-col gap-1">
        <AttributeRow label="Tamaño" value={data.organizationSizeName} />
        <AttributeRow
          label="Sedes"
          value={
            data.organizationBranchesQuantity != null
              ? String(data.organizationBranchesQuantity)
              : null
          }
        />
        <AttributeRow label="Medición" value={data.name} />
      </Box>

      {/* Right column - main activity */}
      {data.organizationMainActivityName && (
        <Box
          className="space-between flex min-w-[300px] items-center justify-between px-4 py-2"
          sx={{ backgroundColor: alpha(theme.palette.text.primary, 0.06) }}
        >
          <Box className="flex flex-col">
            <Typography variant="caption" color="text.secondary">
              Actividad principal
            </Typography>
            <Typography variant="subtitle1" fontWeight="fontWeightMedium">
              {data.organizationMainActivityName}
            </Typography>
            {data.organizationMainActivityQuantity != null && (
              <Typography variant="caption" color="text.secondary">
                {formatQuantity(data.organizationMainActivityQuantity)}
              </Typography>
            )}
          </Box>
          <EmissionResultsScreenTrashIcon
            aria-hidden="true"
            focusable="false"
            sx={{ fontSize: 40 }}
          />
        </Box>
      )}
    </Box>
  );
};

const AttributeRow: FC<{ label: string; value: string | null }> = ({
  label,
  value,
}) => (
  <Box className="flex gap-2">
    <Typography variant="subtitle1" className="min-w-36">
      {label}:
    </Typography>
    <Typography variant="subtitle1" fontWeight="fontWeightMedium">
      {value ?? "-"}
    </Typography>
  </Box>
);
