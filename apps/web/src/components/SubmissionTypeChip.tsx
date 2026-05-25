import { FC, useMemo } from "react";
import { useTheme } from "@mui/material";
import { SubmissionType } from "@repo/types";
import { CustomPaletteChip } from "./CustomPaletteChip";
import { SUBMISSION_TYPE_LABELS } from "@/labels/chips/submissionType";
import type { CustomPaletteConfig } from "@/labels/chips/types";

interface SubmissionTypeChipProps {
  type: SubmissionType;
}

export const SubmissionTypeChip: FC<SubmissionTypeChipProps> = ({ type }) => {
  const theme = useTheme();
  const config = useMemo<CustomPaletteConfig>(
    () => ({
      ...SUBMISSION_TYPE_LABELS[type],
      color: theme.palette.requestTypeColors[type],
    }),
    [type, theme]
  );
  return <CustomPaletteChip config={config} />;
};
