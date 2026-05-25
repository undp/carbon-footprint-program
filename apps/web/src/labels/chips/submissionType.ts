import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { SubmissionType } from "@repo/types";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { CustomPaletteConfig, sortOrderByKey } from "./types";

type SubmissionTypeLabelEntry = Pick<
  CustomPaletteConfig,
  "label" | "tooltip" | "sortOrder"
>;

export const SUBMISSION_TYPE_LABELS: Record<
  SubmissionType,
  SubmissionTypeLabelEntry
> = {
  [SubmissionType.ORGANIZATION_ACCREDITATION]: {
    label: `${capitalize(VOCAB.inscription.noun.singular)} ${VOCAB.organization.noun.singular}`,
    tooltip: `Solicitud de ${VOCAB.inscription.noun.singular} de ${VOCAB.organization.noun.singular}`,
    sortOrder: 0,
  },
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: {
    label: "Reconocimiento de medición",
    tooltip: "Solicitud de reconocimiento de medición de huella",
    sortOrder: 1,
  },
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: {
    label: "Reconocimiento de verificación",
    tooltip: "Solicitud de reconocimiento de verificación de huella",
    sortOrder: 2,
  },
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: {
    label: "Reconocimiento de reducción",
    tooltip: "Solicitud de reconocimiento de reducción de emisiones",
    sortOrder: 3,
  },
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: {
    label: "Reconocimiento de neutralización",
    tooltip: "Solicitud de reconocimiento de neutralización de emisiones",
    sortOrder: 4,
  },
};

export const SUBMISSION_TYPE_SORT_ORDER = sortOrderByKey(
  SUBMISSION_TYPE_LABELS
);

export const useSubmissionTypeConfig = (
  type: SubmissionType
): CustomPaletteConfig => {
  const theme = useTheme();
  return useMemo(
    () => ({
      ...SUBMISSION_TYPE_LABELS[type],
      color: theme.palette.requestTypeColors[type],
    }),
    [type, theme]
  );
};
