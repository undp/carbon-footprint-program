import { describe, expect, it } from "vitest";
import { MethodologyVersionStatus } from "@repo/types";
import { StatusFamily } from "./types";
import { METHODOLOGY_STATUS_CONFIG } from "./methodology";

// [status, family, label, tooltip] — plain Spanish string literals.
const CASES: [MethodologyVersionStatus, StatusFamily, string, string][] = [
  [
    MethodologyVersionStatus.PUBLISHED,
    StatusFamily.POSITIVE,
    "Activa",
    "Metodología publicada y disponible",
  ],
  [
    MethodologyVersionStatus.UNPUBLISHED,
    StatusFamily.NEUTRAL,
    "Inactiva",
    "Metodología no publicada",
  ],
  [
    MethodologyVersionStatus.DELETED,
    StatusFamily.NEUTRAL,
    "Eliminada",
    "Metodología eliminada",
  ],
];

describe("METHODOLOGY_STATUS_CONFIG", () => {
  it("has an entry for every MethodologyVersionStatus value", () => {
    expect(Object.keys(METHODOLOGY_STATUS_CONFIG).sort()).toEqual(
      Object.values(MethodologyVersionStatus).sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label and tooltip",
    (status, family, label, tooltip) => {
      const entry = METHODOLOGY_STATUS_CONFIG[status];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );

  it("uses a StatusFamily enum value for every family", () => {
    const families = Object.values(StatusFamily);
    for (const entry of Object.values(METHODOLOGY_STATUS_CONFIG)) {
      expect(families).toContain(entry.family);
    }
  });
});
