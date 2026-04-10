import { FC } from "react";
import { Chip, useTheme } from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import {
  RECOGNITION_ICON,
  RECOGNITION_TYPE_LABEL,
  SHORT_RECOGNITION_TYPE_LABEL,
  type RecognitionType,
} from "@/utils/submissions";

interface RecognitionChipProps {
  type: RecognitionType;
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
      : SHORT_RECOGNITION_TYPE_LABEL[type];
  const IconComponent = RECOGNITION_ICON[type];

  return (
    <Chip
      icon={
        <IconComponent
          sx={{
            fontSize: "0.875rem", //14px
            color: `${darken(color, 0.7)} !important`,
          }}
        />
      }
      label={label}
      sx={{
        height: 26,
        backgroundColor: alpha(color, 0.6),
        border: `1px solid ${color}`,
        color: darken(color, 0.7),
        fontWeight: 500,
      }}
    />
  );
};
