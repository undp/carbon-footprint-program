import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { EmissionResultsScreenTrashIcon } from "@/icons";
import { LoadingErrorStateMessage } from "../LoadingErrorStateMessage";
import { EmptyStateMessage } from "../EmptyStateMessage";
import { formatQuantity } from "@/utils/formatting";

interface InventoryAttributesCardProps {
  data: GetCarbonInventoryMetadataResponse | undefined;
  isLoading: boolean;
  errorLoading?: boolean;
}

export const InventoryAttributesCard: FC<InventoryAttributesCardProps> = ({
  data,
  isLoading,
  errorLoading = false,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={124}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  if (errorLoading) {
    return (
      <LoadingErrorStateMessage
        message="Ocurrió un error al cargar los atributos del inventario"
        className="max-h-[120px]"
      />
    );
  }

  if (!data) {
    return (
      <EmptyStateMessage
        message="No se encontraron los atributos del inventario"
        className="max-h-[120px]"
      />
    );
  }

  return (
    <Box
      className="flex gap-6 rounded-lg p-4"
      sx={{ backgroundColor: alpha("#414046", 0.03) }}
    >
      {/* Left column */}
      <Box className="flex flex-1 flex-col gap-1">
        <AttributeRow label="Nombre empresa" value={data.organizationName} />
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
          sx={{ backgroundColor: alpha("#414046", 0.06) }}
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
          <EmissionResultsScreenTrashIcon sx={{ fontSize: 40 }} />
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
