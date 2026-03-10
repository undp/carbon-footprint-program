import { FC } from "react";
import {
  Chip,
  Typography,
  alpha,
  Theme,
  useTheme,
  darken,
  ChipProps,
} from "@mui/material";
import {
  CarbonInventoryDisplayStatusEnum,
  CarbonInventoryDisplayStatus,
} from "@repo/types";

// TODO: improve colors for each status
const getStatusColor = (
  theme: Theme,
  status: CarbonInventoryDisplayStatus
): string => {
  switch (status) {
    case CarbonInventoryDisplayStatusEnum.DRAFT:
      return theme.palette.grey[400];
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION:
      return theme.palette.info.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION:
      return theme.palette.info.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.DELETED:
      return theme.palette.error.main;
    default:
      return theme.palette.grey[400];
  }
};

const STATUS_LABELS: Record<CarbonInventoryDisplayStatus, string> = {
  [CarbonInventoryDisplayStatusEnum.DRAFT]: "Borrador",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]:
    "Postulando a cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED]:
    "Objetado en cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]:
    "Rechazado en cálculo",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]: "Calculado",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]:
    "Postulando a verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED]:
    "Objetado en verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]:
    "Rechazado en verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]: "Verificado",
  [CarbonInventoryDisplayStatusEnum.DELETED]: "Eliminado",
};

interface CarbonInventoryStatusChipProps {
  status: CarbonInventoryDisplayStatus;
  size?: ChipProps["size"];
}

export const CarbonInventoryStatusChip: FC<CarbonInventoryStatusChipProps> = ({
  status,
  size = "small",
}) => {
  const theme = useTheme();

  const variant = size === "medium" ? "subtitle1" : "subtitle2";
  const fontWeight = size === "medium" ? "fontWeightMedium" : undefined;

  return (
    <Chip
      sx={{
        padding: "6px 16px",
        backgroundColor: alpha(getStatusColor(theme, status), 0.3),
        color: darken(getStatusColor(theme, status), 0.5),
        border: `1px solid ${alpha(getStatusColor(theme, status), 0.3)}`,
        textTransform: "uppercase",
      }}
      label={
        <Typography variant={variant} fontWeight={fontWeight}>
          {STATUS_LABELS[status]}
        </Typography>
      }
      size={size}
    />
  );
};
