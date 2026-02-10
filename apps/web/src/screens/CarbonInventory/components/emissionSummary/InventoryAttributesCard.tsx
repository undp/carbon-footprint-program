import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";

interface InventoryAttributesCardProps {
  data: GetCarbonInventoryMetadataResponse | undefined;
  isLoading: boolean;
}

export const InventoryAttributesCard: FC<InventoryAttributesCardProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={100}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  if (!data) return null;

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
          className="flex flex-1 flex-col justify-center rounded-lg p-3"
          sx={{ backgroundColor: alpha("#414046", 0.03) }}
        >
          <Typography variant="caption" color="text.secondary">
            Actividad principal
          </Typography>
          <Typography variant="body2" fontWeight="fontWeightSemiBold">
            {data.organizationMainActivityName}
          </Typography>
          {data.organizationMainActivityQuantity != null && (
            <Typography variant="body2" color="text.secondary">
              {data.organizationMainActivityQuantity.toLocaleString("es-CL")}
            </Typography>
          )}
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
    <Typography variant="caption" color="text.secondary" className="min-w-24">
      {label}:
    </Typography>
    <Typography variant="caption" fontWeight="fontWeightMedium">
      {value ?? "-"}
    </Typography>
  </Box>
);
