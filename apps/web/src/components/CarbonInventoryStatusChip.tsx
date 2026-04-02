import { FC } from "react";
import {
  Chip,
  Typography,
  alpha,
  Theme,
  useTheme,
  darken,
  ChipProps,
  Tooltip,
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
    case CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED:
      return theme.palette.error.main;
    case CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED:
      return theme.palette.success.main;
    case CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION:
      return theme.palette.warning.main;
    case CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED:
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
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED]: "Con observaciones",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]: "Rechazado",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]: "Aprobado",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]: "En revisión",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED]: "Con observaciones",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]: "Rechazado",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]: "Aprobado",
  [CarbonInventoryDisplayStatusEnum.DELETED]: "Eliminado",
};

//TODO: This is temporal solution until we implement the designs
const TOOLTIP_LABELS: Record<CarbonInventoryDisplayStatus, string> = {
  [CarbonInventoryDisplayStatusEnum.DRAFT]: "En Borrador",
  [CarbonInventoryDisplayStatusEnum.SELF_DECLARED]: "Huella autodeclarada",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION]:
    "En revisión - Sello de medición",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED]:
    "Con observaciones - Sello de medición",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED]:
    "Rechazado - Sello de medición",
  [CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED]:
    "Aprobado - Sello de medición",
  [CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION]:
    "En revisión - Sello de verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED]:
    "Con observaciones - Sello de verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED]:
    "Rechazado - Sello de verificación",
  [CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED]:
    "Aprobado - Sello de verificación",
  [CarbonInventoryDisplayStatusEnum.DELETED]: "Huella eliminada",
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
    <Tooltip title={TOOLTIP_LABELS[status]}>
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
    </Tooltip>
  );
};
