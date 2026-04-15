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
import { getReductionProjectStatusLabel } from "@/utils/reductionProject";

const getStatusColor = (
  theme: Theme,
  status: ReductionProjectDisplayStatus
): string => {
  switch (status) {
    case ReductionProjectDisplayStatusEnum.DRAFT:
      return theme.palette.grey[400];
    case ReductionProjectDisplayStatusEnum.SUBMITTED:
      return theme.palette.info.main;
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
  const statusColor = getStatusColor(theme, status);

  return (
    <Tooltip title={TOOLTIP_LABELS[status]}>
      <Chip
        sx={{
          padding: "6px 16px",
          backgroundColor: alpha(statusColor, 0.3),
          color: darken(statusColor, 0.5),
          border: `1px solid ${alpha(statusColor, 0.3)}`,
          textTransform: "uppercase",
        }}
        label={
          <Typography variant={variant} fontWeight={fontWeight}>
            {getReductionProjectStatusLabel(status)}
          </Typography>
        }
        size={size}
      />
    </Tooltip>
  );
};
