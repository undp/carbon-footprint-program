import { FC } from "react";
import { useTheme } from "@mui/material";
import { SubmissionType } from "@repo/types";
import { TypeChip } from "./TypeChip";
import { SUBMISSION_TYPE_LABELS } from "@/labels/chips/submissionType";

interface SubmissionTypeChipProps {
  type: SubmissionType;
}

export const SubmissionTypeChip: FC<SubmissionTypeChipProps> = ({ type }) => {
  const theme = useTheme();
  const { label, tooltip } = SUBMISSION_TYPE_LABELS[type];

  return (
    <TypeChip
      color={theme.palette.submissionTypeColors[type]}
      label={label}
      tooltip={tooltip}
    />
  );
};
