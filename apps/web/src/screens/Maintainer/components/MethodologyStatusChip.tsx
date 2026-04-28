import { FC } from "react";
import { Chip, ChipProps } from "@mui/material";
import { MethodologyVersionStatus } from "@repo/types";
import { METHODOLOGY_STATUS_LABELS } from "../constants";

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
    label={METHODOLOGY_STATUS_LABELS[status]}
  />
);
