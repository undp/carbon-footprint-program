import { describe, expect, it } from "vitest";
import { StatusFamily } from "./types";
import { BADGE_STATUS_CONFIG, BadgeActivationStatus } from "./badge";

// [status, family, label, tooltip] — plain Spanish string literals.
const CASES: [BadgeActivationStatus, StatusFamily, string, string][] = [
  [
    BadgeActivationStatus.ACTIVE,
    StatusFamily.POSITIVE,
    "Activo",
    "Sello activo y disponible",
  ],
  [
    BadgeActivationStatus.INACTIVE,
    StatusFamily.NEUTRAL,
    "Inactivo",
    "Sello inactivo",
  ],
];

describe("BADGE_STATUS_CONFIG", () => {
  it("has an entry for every BadgeActivationStatus value", () => {
    expect(Object.keys(BADGE_STATUS_CONFIG).sort()).toEqual(
      Object.values(BadgeActivationStatus).sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label and tooltip",
    (status, family, label, tooltip) => {
      const entry = BADGE_STATUS_CONFIG[status];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );

  it("uses a StatusFamily enum value for every family", () => {
    const families = Object.values(StatusFamily);
    for (const entry of Object.values(BADGE_STATUS_CONFIG)) {
      expect(families).toContain(entry.family);
    }
  });
});
