import { FC } from "react";
import { SubmissionType } from "@repo/types";
import { CustomPaletteChip } from "./CustomPaletteChip";
import { useSubmissionTypeConfig } from "@/labels/status/submissionType";

interface SubmissionTypeChipProps {
  type: SubmissionType;
}

export const SubmissionTypeChip: FC<SubmissionTypeChipProps> = ({ type }) => {
  const config = useSubmissionTypeConfig(type);
  return <CustomPaletteChip config={config} />;
};
