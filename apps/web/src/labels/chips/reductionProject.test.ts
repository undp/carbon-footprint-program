import { describe, expect, it } from "vitest";
import {
  ReductionProjectDisplayStatus,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { StatusFamily } from "./types";
import { REDUCTION_PROJECT_STATUS_CONFIG } from "./reductionProject";

// [status, family, label, tooltip] — plain Spanish string literals.
const CASES: [ReductionProjectDisplayStatus, StatusFamily, string, string][] = [
  [
    ReductionProjectDisplayStatusEnum.DRAFT,
    StatusFamily.NEUTRAL,
    "Borrador",
    "En Borrador",
  ],
  [
    ReductionProjectDisplayStatusEnum.SUBMITTED,
    StatusFamily.IN_REVIEW,
    "En revisión",
    "En revisión - Reconocimiento de reducción",
  ],
  [
    ReductionProjectDisplayStatusEnum.REVIEWED,
    StatusFamily.ACTION_REQUIRED,
    "Con observaciones",
    "Con observaciones - Reconocimiento de reducción",
  ],
  [
    ReductionProjectDisplayStatusEnum.REJECTED,
    StatusFamily.NEGATIVE,
    "Rechazado",
    "Rechazado - Reconocimiento de reducción",
  ],
  [
    ReductionProjectDisplayStatusEnum.APPROVED,
    StatusFamily.POSITIVE,
    "Aprobado",
    "Aprobado - Reconocimiento de reducción",
  ],
  [
    ReductionProjectDisplayStatusEnum.DELETED,
    StatusFamily.NEUTRAL,
    "Eliminado",
    "Proyecto eliminado",
  ],
];

describe("REDUCTION_PROJECT_STATUS_CONFIG", () => {
  it("has an entry for every ReductionProjectDisplayStatus value", () => {
    expect(Object.keys(REDUCTION_PROJECT_STATUS_CONFIG).sort()).toEqual(
      Object.values(ReductionProjectDisplayStatusEnum).sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label and tooltip",
    (status, family, label, tooltip) => {
      const entry = REDUCTION_PROJECT_STATUS_CONFIG[status];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );

  it("uses a StatusFamily enum value for every family", () => {
    const families = Object.values(StatusFamily);
    for (const entry of Object.values(REDUCTION_PROJECT_STATUS_CONFIG)) {
      expect(families).toContain(entry.family);
    }
  });
});
