import { describe, expect, it } from "vitest";
import { CollisionState, CollisionStateSchema } from "@repo/types";
import { StatusFamily } from "./types";
import { COLLISION_STATE_CONFIG } from "./collisionState";

// [state, family, label, tooltip] — labels/tooltips are composed from VOCAB, so
// assert the rendered Spanish text to catch vocabulary drift.
const CASES: [CollisionState, StatusFamily, string, string][] = [
  [
    "APPROVED",
    StatusFamily.ACTION_REQUIRED,
    "Inscrita",
    "Coincide con una organización ya inscrita, comparada contra sus datos aprobados",
  ],
  [
    "PENDING",
    StatusFamily.IN_REVIEW,
    "Pendiente",
    "Coincide con otra postulación pendiente de revisión",
  ],
];

describe("COLLISION_STATE_CONFIG", () => {
  it("has an entry for every CollisionState value", () => {
    expect(Object.keys(COLLISION_STATE_CONFIG).sort()).toEqual(
      [...CollisionStateSchema.options].sort()
    );
  });

  it.each(CASES)(
    "maps %s to its family, label and tooltip",
    (state, family, label, tooltip) => {
      const entry = COLLISION_STATE_CONFIG[state];
      expect(entry.family).toBe(family);
      expect(entry.label).toBe(label);
      expect(entry.tooltip).toBe(tooltip);
    }
  );

  it("gives every state a non-empty tooltip (status-chip convention)", () => {
    for (const entry of Object.values(COLLISION_STATE_CONFIG)) {
      expect(entry.tooltip.length).toBeGreaterThan(0);
    }
  });
});
