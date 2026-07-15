import { describe, expect, it } from "vitest";
import { SubmissionType } from "@repo/types";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import {
  SUBMISSION_TYPE_LABELS,
  SUBMISSION_TYPE_SORT_ORDER,
} from "./submissionType";

// [type, label, tooltip, sortOrder] — the four recognition entries use plain
// sentence-case Spanish literals (intentionally different from the Title-case
// RECOGNITION_TYPE_LABELS sibling). ORGANIZATION_ACCREDITATION is interpolated
// from VOCAB and is asserted separately below.
const PLAIN_CASES: [SubmissionType, string, string, number][] = [
  [
    SubmissionType.CARBON_INVENTORY_CALCULATION,
    "Reconocimiento de medición",
    "Solicitud de reconocimiento de medición de huella",
    1,
  ],
  [
    SubmissionType.CARBON_INVENTORY_VERIFICATION,
    "Reconocimiento de verificación",
    "Solicitud de reconocimiento de verificación de huella",
    2,
  ],
  [
    SubmissionType.REDUCTION_PROJECT_VERIFICATION,
    "Reconocimiento de reducción",
    "Solicitud de reconocimiento de reducción de emisiones",
    3,
  ],
  [
    SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
    "Reconocimiento de neutralización",
    "Solicitud de reconocimiento de neutralización de emisiones",
    4,
  ],
];

describe("SUBMISSION_TYPE_LABELS", () => {
  it("has an entry for every SubmissionType value", () => {
    expect(Object.keys(SUBMISSION_TYPE_LABELS).sort()).toEqual(
      Object.values(SubmissionType).sort()
    );
  });

  it.each(PLAIN_CASES)(
    "maps %s to its sentence-case label, tooltip and sortOrder",
    (type, label, tooltip, sortOrder) => {
      const entry = SUBMISSION_TYPE_LABELS[type];
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
      expect(entry.sortOrder).toBe(sortOrder);
    }
  );

  it("assigns unique sortOrders that are contiguous from 0", () => {
    const orders = Object.values(SUBMISSION_TYPE_LABELS).map(
      (entry) => entry.sortOrder
    );
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(
      orders.map((_, index) => index)
    );
  });
});

describe("SUBMISSION_TYPE_LABELS — ORGANIZATION_ACCREDITATION (VOCAB-interpolated)", () => {
  const entry =
    SUBMISSION_TYPE_LABELS[SubmissionType.ORGANIZATION_ACCREDITATION];

  // Reconstruct from the same VOCAB/capitalize the source uses instead of
  // hard-coding the resolved Spanish (which varies per deployment vocabulary).
  it("builds the label from the inscription + organization VOCAB nouns", () => {
    const expected = `${capitalize(VOCAB.inscription.noun.singular)} ${VOCAB.organization.noun.singular}`;
    expect(entry.label).toBe(expected);
    expect(entry.label.length).toBeGreaterThan(0);
  });

  it("builds the 'Solicitud de …' tooltip from VOCAB", () => {
    const expected = `Solicitud de ${VOCAB.inscription.noun.singular} de ${VOCAB.organization.noun.singular}`;
    expect(entry.tooltip).toBe(expected);
    expect(entry.tooltip.length).toBeGreaterThan(0);
  });

  it("sorts first (sortOrder 0)", () => {
    expect(entry.sortOrder).toBe(0);
  });
});

describe("SUBMISSION_TYPE_SORT_ORDER", () => {
  it("covers exactly the same keys as the config", () => {
    expect(Object.keys(SUBMISSION_TYPE_SORT_ORDER).sort()).toEqual(
      Object.keys(SUBMISSION_TYPE_LABELS).sort()
    );
  });

  it.each(Object.keys(SUBMISSION_TYPE_LABELS) as SubmissionType[])(
    "maps %s to its config sortOrder",
    (type) => {
      expect(SUBMISSION_TYPE_SORT_ORDER[type]).toBe(
        SUBMISSION_TYPE_LABELS[type].sortOrder
      );
    }
  );
});
