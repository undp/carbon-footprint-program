import { describe, expect, it } from "vitest";
import { RECOGNITION_SUBMISSION_TYPES, SubmissionType } from "@repo/types";
import type { CarbonInventoryRecognitionsType } from "@repo/types";
import {
  VerifiedOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { RECOGNITION_TYPE_LABELS } from "./recognitionType";

// [type, fullLabel, chipLabel, tooltip, icon] — plain Title-case Spanish
// literals for the RecognitionChip (intentionally worded differently from the
// sentence-case SUBMISSION_TYPE_LABELS sibling).
const CASES: [
  CarbonInventoryRecognitionsType,
  string,
  string,
  string,
  SvgIconComponent,
][] = [
  [
    SubmissionType.CARBON_INVENTORY_CALCULATION,
    "Reconocimiento de Medición",
    "Medición",
    "Reconocimiento de Medición",
    VerifiedOutlined,
  ],
  [
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
    "Reconocimiento de Verificación",
    "Verificación",
    "Reconocimiento de Verificación",
    WorkspacePremiumOutlined,
  ],
  [
    SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    "Reconocimiento de Reducción",
    "Reducción",
    "Reconocimiento de Reducción",
    WorkspacePremiumOutlined,
  ],
  [
    SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
    "Reconocimiento de Neutralización",
    "Neutralización",
    "Reconocimiento de Neutralización",
    WorkspacePremiumOutlined,
  ],
];

describe("RECOGNITION_TYPE_LABELS", () => {
  it("has an entry for every recognition type (all submission types except accreditation)", () => {
    const recognitionTypes = Object.values(SubmissionType).filter(
      (type) => type !== SubmissionType.ORGANIZATION_ACCREDITATION
    );
    expect(Object.keys(RECOGNITION_TYPE_LABELS).sort()).toEqual(
      recognitionTypes.sort()
    );
  });

  it("covers exactly the RECOGNITION_SUBMISSION_TYPES list from @repo/types", () => {
    expect(Object.keys(RECOGNITION_TYPE_LABELS).sort()).toEqual(
      [...RECOGNITION_SUBMISSION_TYPES].sort()
    );
  });

  it("does not include ORGANIZATION_ACCREDITATION (recognition surface only)", () => {
    expect(RECOGNITION_TYPE_LABELS).not.toHaveProperty(
      SubmissionType.ORGANIZATION_ACCREDITATION
    );
  });

  it.each(CASES)(
    "maps %s to its full label, chip label, tooltip and icon",
    (type, fullLabel, chipLabel, tooltip, icon) => {
      const entry = RECOGNITION_TYPE_LABELS[type];
      expect(entry.fullLabel).toBe(fullLabel);
      expect(entry.chipLabel).toBe(chipLabel);
      expect(entry.tooltip).toBe(tooltip);
      expect(entry.icon).toBe(icon);
    }
  );

  it("uses the full label as the tooltip for every entry", () => {
    for (const entry of Object.values(RECOGNITION_TYPE_LABELS)) {
      expect(entry.tooltip).toBe(entry.fullLabel);
    }
  });
});
