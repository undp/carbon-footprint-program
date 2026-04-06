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
  ReductionProjectDisplayStatusEnum,
  ReductionProjectDisplayStatus,
} from "@repo/types";

const getStatusColor = (
  theme: Theme,
  status: ReductionProjectDisplayStatus
): string => {
  switch (status) {
    case ReductionProjectDisplayStatusEnum.DRAFT:
      return theme.palette.grey[400];
    case ReductionProjectDisplayStatusEnum.SUBMITTED:
      return theme.palette.warning.main;
    case ReductionProjectDisplayStatusEnum.REVIEWED:
      return theme.palette.warning.main;
    case ReductionProjectDisplayStatusEnum.REJECTED:
      return theme.palette.error.main;
    case ReductionProjectDisplayStatusEnum.APPROVED:
      return theme.palette.success.main;
    case ReductionProjectDisplayStatusEnum.DELETED:
      return theme.palette.error.main;
    default:
      return theme.palette.grey[400];
  }
};

const STATUS_LABELS: Record<ReductionProjectDisplayStatus, string> = {
  [ReductionProjectDisplayStatusEnum.DRAFT]: "Borrador",
  [ReductionProjectDisplayStatusEnum.SUBMITTED]: "En revisión",
  [ReductionProjectDisplayStatusEnum.REVIEWED]: "Con observaciones",
  [ReductionProjectDisplayStatusEnum.REJECTED]: "Rechazado",
  [ReductionProjectDisplayStatusEnum.APPROVED]: "Aprobado",
  [ReductionProjectDisplayStatusEnum.DELETED]: "Eliminado",
};

const TOOLTIP_LABELS: Record<ReductionProjectDisplayStatus, string> = {
  [ReductionProjectDisplayStatusEnum.DRAFT]: "En Borrador",
  [ReductionProjectDisplayStatusEnum.SUBMITTED]:
    "En revisión - Sello de reducción",
  [ReductionProjectDisplayStatusEnum.REVIEWED]:
    "Con observaciones - Sello de reducción",
  [ReductionProjectDisplayStatusEnum.REJECTED]:
    "Rechazado - Sello de reducción",
  [ReductionProjectDisplayStatusEnum.APPROVED]: "Aprobado - Sello de reducción",
  [ReductionProjectDisplayStatusEnum.DELETED]: "Proyecto eliminado",
};

interface ReductionProjectStatusChipProps {
  status: ReductionProjectDisplayStatus;
  size?: ChipProps["size"];
}

export const ReductionProjectStatusChip: FC<
  ReductionProjectStatusChipProps
> = ({ status, size = "small" }) => {
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
