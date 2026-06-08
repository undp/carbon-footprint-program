import { CarbonInventoryRecognitionsType, SubmissionType } from "@repo/types";
import {
  SvgIconComponent,
  VerifiedOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";

type RecognitionLabelEntry = {
  fullLabel: string;
  chipLabel: string;
  tooltip: string;
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
    icon: VerifiedOutlined,
  },
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: {
    fullLabel: "Reconocimiento de Verificación",
    chipLabel: "Verificación",
    tooltip: "Reconocimiento de Verificación",
    icon: WorkspacePremiumOutlined,
  },
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: {
    fullLabel: "Reconocimiento de Reducción",
    chipLabel: "Reducción",
    tooltip: "Reconocimiento de Reducción",
    icon: WorkspacePremiumOutlined,
  },
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: {
    fullLabel: "Reconocimiento de Neutralización",
    chipLabel: "Neutralización",
    tooltip: "Reconocimiento de Neutralización",
    icon: WorkspacePremiumOutlined,
  },
};
