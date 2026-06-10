import { FC } from "react";
import { useTheme } from "@mui/material";
import { darken } from "@mui/material/styles";
import { RECOGNITION_TYPE_LABELS } from "@/labels/chips/recognitionType";
import { CarbonInventoryRecognitionsType } from "@repo/types";
import { TypeChip } from "./TypeChip";

interface RecognitionChipProps {
  type: CarbonInventoryRecognitionsType;
  variant?: "short" | "full";
}

export const RecognitionChip: FC<RecognitionChipProps> = ({
  type,
  variant = "short",
}) => {
  const theme = useTheme();
  const color = theme.palette.recognitionTypeColors[type];
  const {
    fullLabel,
    chipLabel,
    tooltip,
    icon: Icon,
  } = RECOGNITION_TYPE_LABELS[type];

  return (
    <TypeChip
      color={color}
      label={variant === "full" ? fullLabel : chipLabel}
      tooltip={tooltip}
      icon={
        <Icon
          sx={{
            fontSize: "0.875rem", //14px
            color: `${darken(color, 0.7)} !important`,
          }}
        />
      }
    />
  );
};
