import { FC } from "react";
import { useTheme } from "@mui/material";
import { darken } from "@mui/material/styles";
import {
  RECOGNITION_ICON,
  RECOGNITION_TYPE_LABEL,
  RECOGNITION_TYPE_CHIP_LABEL,
} from "@/utils/recognitions";
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
  const label =
    variant === "full"
      ? RECOGNITION_TYPE_LABEL[type]
      : RECOGNITION_TYPE_CHIP_LABEL[type];
  const IconComponent = RECOGNITION_ICON[type];

  return (
    <TypeChip
      color={color}
      label={label}
      icon={
        <IconComponent
          sx={{
            fontSize: "0.875rem", //14px
            color: `${darken(color, 0.7)} !important`,
          }}
        />
      }
    />
  );
};
