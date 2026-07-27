import { describe, expect, it } from "vitest";
import {
  CollisionState,
  CollisionStateSchema,
  SubmissionStatus,
} from "@repo/types";
import { StatusFamily } from "./types";
import {
  ADMIN_ORGANIZATION_STATUS_CONFIG,
  AdminOrganizationDisplayStatus,
} from "./organization";
import { SUBMISSION_STATUS_CONFIG } from "./submission";
import { COLLISION_STATE_CONFIG } from "./collisionState";

// [state, family, label, tooltip] — labels/tooltips are composed from VOCAB, so
// assert the rendered Spanish text to catch vocabulary drift.
const CASES: [CollisionState, StatusFamily, string, string][] = [
  [
    "APPROVED",
    StatusFamily.POSITIVE,
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

  // The chip states what the OTHER organization is, so it must not invent its
  // own color code: an inscribed organization has to look inscribed here too.
  it("reuses the canonical family and label of an inscribed organization", () => {
    const inscribed =
      ADMIN_ORGANIZATION_STATUS_CONFIG[
        AdminOrganizationDisplayStatus.ACCREDITED
      ];
    expect(COLLISION_STATE_CONFIG.APPROVED.family).toBe(inscribed.family);
    expect(COLLISION_STATE_CONFIG.APPROVED.label).toBe(inscribed.label);
  });

  it("reuses the canonical family and label of a pending submission", () => {
    const pending = SUBMISSION_STATUS_CONFIG[SubmissionStatus.PENDING];
    expect(COLLISION_STATE_CONFIG.PENDING.family).toBe(pending.family);
    expect(COLLISION_STATE_CONFIG.PENDING.label).toBe(pending.label);
  });

  it("gives every state a non-empty tooltip (status-chip convention)", () => {
    for (const entry of Object.values(COLLISION_STATE_CONFIG)) {
      expect(entry.tooltip.length).toBeGreaterThan(0);
    }
  });
});
