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

// Sibling of SUBMISSION_TYPE_LABELS (./submissionType): the same recognition
// types, but Title-case labels + short chip labels + icons for the
// RecognitionChip. Wording intentionally differs from SUBMISSION_TYPE_LABELS
// (different surface); keep the type set in sync if a recognition type changes.
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
