import { describe, expect, it } from "vitest";
import { BadgeType, SubmissionType } from "@repo/types";
import {
  RECOGNITION_BADGE_TYPES,
  RECOGNITION_SUBMISSION_TYPES,
  RECOGNITION_TYPE_CHIP_LABEL,
  RECOGNITION_TYPE_LABEL,
} from "./recognitions";

describe("RECOGNITION_TYPE_LABEL", () => {
  it("maps every recognition type to its Spanish full label", () => {
    expect(RECOGNITION_TYPE_LABEL).toEqual({
      [SubmissionType.CARBON_INVENTORY_CALCULATION]:
        "Reconocimiento de Medición",
      [SubmissionType.CARBON_INVENTORY_VERIFICATION]:
        "Reconocimiento de Verificación",
      [SubmissionType.REDUCTION_PROJECT_VERIFICATION]:
        "Reconocimiento de Reducción",
      [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]:
        "Reconocimiento de Neutralización",
    });
  });
});

describe("RECOGNITION_TYPE_CHIP_LABEL", () => {
  it("maps every recognition type to its Spanish chip label", () => {
    expect(RECOGNITION_TYPE_CHIP_LABEL).toEqual({
      [SubmissionType.CARBON_INVENTORY_CALCULATION]: "Medición",
      [SubmissionType.CARBON_INVENTORY_VERIFICATION]: "Verificación",
      [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: "Reducción",
      [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: "Neutralización",
    });
  });
});

describe("RECOGNITION_SUBMISSION_TYPES", () => {
  it("lists the calculation, verification and reduction types in order", () => {
    expect(RECOGNITION_SUBMISSION_TYPES).toEqual([
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    ]);
  });

  it("hides the neutralization type until the admin module ships", () => {
    expect(RECOGNITION_SUBMISSION_TYPES).not.toContain(
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION
    );
  });
});

describe("RECOGNITION_BADGE_TYPES", () => {
  it("lists the three enabled badge types in order", () => {
    expect(RECOGNITION_BADGE_TYPES).toEqual([
      BadgeType.CARBON_INVENTORY_CALCULATION,
      BadgeType.CARBON_INVENTORY_VERIFICATION,
      BadgeType.REDUCTION_PROJECT_VERIFICATION,
    ]);
  });

  it("excludes the neutralization and organization accreditation badges", () => {
    expect(RECOGNITION_BADGE_TYPES).not.toContain(
      BadgeType.NEUTRALIZATION_PLAN_VERIFICATION
    );
    expect(RECOGNITION_BADGE_TYPES).not.toContain(
      BadgeType.ORGANIZATION_ACCREDITATION
    );
  });
});
