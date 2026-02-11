import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { EmissionResultsScreenTrashIcon } from "@/icons";

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
          className="space-between flex min-w-[300px] items-center justify-between px-4 py-2"
          sx={{ backgroundColor: alpha("#414046", 0.06) }}
        >
          <Box className="flex flex-col">
            <Typography variant="caption" color="text.secondary">
              Actividad principal
            </Typography>
            <Typography variant="subtitle1" fontWeight="fontWeightSemiBold">
              {data.organizationMainActivityName}
            </Typography>
            {data.organizationMainActivityQuantity != null && (
              <Typography variant="caption" color="text.secondary">
                {data.organizationMainActivityQuantity.toLocaleString("es-CL")}
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
