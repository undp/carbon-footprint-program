import { FC } from "react";
import { Chip, ChipProps } from "@mui/material";
import { MethodologyVersionStatus } from "@repo/types";

const STATUS_LABEL: Record<MethodologyVersionStatus, string> = {
  [MethodologyVersionStatus.PUBLISHED]: "Activa",
  [MethodologyVersionStatus.UNPUBLISHED]: "Inactiva",
  [MethodologyVersionStatus.DELETED]: "Eliminada",
};

const STATUS_COLOR: Record<MethodologyVersionStatus, ChipProps["color"]> = {
  [MethodologyVersionStatus.PUBLISHED]: "success",
  [MethodologyVersionStatus.UNPUBLISHED]: "default",
  [MethodologyVersionStatus.DELETED]: "default",
};

interface Props {
  status: MethodologyVersionStatus;
}

export const MethodologyStatusChip: FC<Props> = ({ status }) => (
  <Chip
    size="small"
    color={STATUS_COLOR[status]}
    label={STATUS_LABEL[status]}
  />
);
