import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { CarbonInventoryRecognitionsType, SubmissionType } from "@repo/types";
import {
  SvgIconComponent,
  VerifiedOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { CustomPaletteConfig } from "./types";

type RecognitionLabelEntry = {
  fullLabel: string;
  chipLabel: string;
  tooltip: string;
  sortOrder: number;
  icon: SvgIconComponent;
};

export const RECOGNITION_TYPE_LABELS: Record<
  CarbonInventoryRecognitionsType,
  RecognitionLabelEntry
> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: {
    fullLabel: "Reconocimiento de Medición",
    chipLabel: "Medición",
    tooltip: "Reconocimiento de Medición",
    sortOrder: 0,
    icon: VerifiedOutlined,
  },
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: {
    fullLabel: "Reconocimiento de Verificación",
    chipLabel: "Verificación",
    tooltip: "Reconocimiento de Verificación",
    sortOrder: 1,
    icon: WorkspacePremiumOutlined,
  },
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: {
    fullLabel: "Reconocimiento de Reducción",
    chipLabel: "Reducción",
    tooltip: "Reconocimiento de Reducción",
    sortOrder: 2,
    icon: WorkspacePremiumOutlined,
  },
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: {
    fullLabel: "Reconocimiento de Neutralización",
    chipLabel: "Neutralización",
    tooltip: "Reconocimiento de Neutralización",
    sortOrder: 3,
    icon: WorkspacePremiumOutlined,
  },
};

export const useRecognitionTypeConfig = (
  type: CarbonInventoryRecognitionsType,
  variant: "short" | "full" = "short"
): CustomPaletteConfig => {
  const theme = useTheme();
  return useMemo(() => {
    const entry = RECOGNITION_TYPE_LABELS[type];
    return {
      label: variant === "full" ? entry.fullLabel : entry.chipLabel,
      tooltip: entry.tooltip,
      sortOrder: entry.sortOrder,
      color: theme.palette.recognitionTypeColors[type],
    };
  }, [type, variant, theme]);
};
