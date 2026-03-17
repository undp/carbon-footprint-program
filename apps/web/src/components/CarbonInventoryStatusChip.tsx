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
    case CarbonInventoryDisplayStatusEnum.SELF_DECLARED:
      return theme.palette.info.main;
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION:
      return theme.palette.warning.main;
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
  [CarbonInventoryDisplayStatusEnum.SELF_DECLARED]: "Autodeclarada",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]: "En revisión",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED]: "Con observaciones",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]: "Rechazado",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]:
    "Aprobado - Sello de medición",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]: "En revisión",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED]: "Con observaciones",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]: "Rechazado",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]:
    "Aprobado - Sello de verificación",
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
