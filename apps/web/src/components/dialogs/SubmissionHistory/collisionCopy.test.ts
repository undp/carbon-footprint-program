import { describe, expect, it } from "vitest";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import {
  SubmissionStatus,
  type CollisionField,
  type OrganizationIdentityCollisionMetadata,
} from "@repo/types";
import { buildCollisionMessage, COLLISION_FIELD_LABELS } from "./collisionCopy";

const metadata = (
  overrides: Partial<OrganizationIdentityCollisionMetadata> = {}
): OrganizationIdentityCollisionMetadata => ({
  collisionState: "APPROVED",
  organizationId: "42",
  organizationIsAccredited: true,
  taxId: "76123456-7",
  legalName: "Acme SpA",
  tradeName: "Acme",
  applicant: {
    taxId: "76123456-7",
    legalName: "Acme SpA",
    tradeName: "Acme Chile",
    submissionStatus: SubmissionStatus.PENDING,
    organizationIsAccredited: false,
  },
  collisionFields: ["legalName"],
  ...overrides,
});

describe("COLLISION_FIELD_LABELS", () => {
  it("labels every collision field", () => {
    const fields: CollisionField[] = ["legalName", "tradeName", "taxId"];

    expect(Object.keys(COLLISION_FIELD_LABELS).sort()).toEqual(fields.sort());
    expect(COLLISION_FIELD_LABELS).toEqual({
      legalName: "razón social",
      tradeName: "nombre comercial",
      taxId: TAX_ID_LABEL_SHORT,
    });
  });
});

describe("buildCollisionMessage", () => {
  it("names the approved postulation of an inscribed organization", () => {
    expect(buildCollisionMessage(metadata())).toBe(
      "Coincide con la postulación aprobada de la organización inscrita (RUT 76123456-7) en razón social."
    );
  });

  it("names a pending postulation of a non-inscribed organization", () => {
    const message = buildCollisionMessage(
      metadata({
        collisionState: "PENDING",
        organizationIsAccredited: false,
        collisionFields: ["tradeName"],
      })
    );

    expect(message).toBe(
      "Coincide con la postulación pendiente de una organización no inscrita (RUT 76123456-7) en nombre comercial."
    );
  });

  it("branches on the organization's standing, not on the collision state", () => {
    // A pending collision can come from an already-inscribed organization
    // editing its data — calling it non-inscribed would be false.
    const message = buildCollisionMessage(
      metadata({ collisionState: "PENDING", organizationIsAccredited: true })
    );

    expect(message).toContain("la postulación pendiente");
    expect(message).toContain("de la organización inscrita");
  });

  it("falls back to the legal name when the organization has no tax id", () => {
    expect(buildCollisionMessage(metadata({ taxId: null }))).toBe(
      "Coincide con la postulación aprobada de la organización inscrita («Acme SpA») en razón social."
    );
  });

  it("joins two colliding fields with 'y'", () => {
    expect(
      buildCollisionMessage(
        metadata({ collisionFields: ["legalName", "tradeName"] })
      )
    ).toContain("en razón social y nombre comercial.");
  });

  it("joins three colliding fields with commas and a final 'y'", () => {
    expect(
      buildCollisionMessage(
        metadata({ collisionFields: ["legalName", "tradeName", "taxId"] })
      )
    ).toContain(`en razón social, nombre comercial y ${TAX_ID_LABEL_SHORT}.`);
  });
});
