import { describe, expect, it } from "vitest";
import type {
  GetSubmissionWarningsResponse,
  OrganizationIdentityCollisionMetadata,
} from "@repo/types";
import { SubmissionStatus, WarningType } from "@repo/types";
import { parseCollisionWarnings } from "./collisionWarnings";

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
  collisionFields: ["legalName", "taxId"],
  ...overrides,
});

/**
 * `type` is loosened on purpose: the contract types it as the current registry,
 * but a newer API can still send a kind this build does not know, and dropping
 * those is exactly what the parser must do at runtime.
 */
type WarningOverrides = Partial<
  Omit<GetSubmissionWarningsResponse[number], "type">
> & { type?: string };

const warning = (
  overrides: WarningOverrides = {}
): GetSubmissionWarningsResponse[number] =>
  ({
    type: WarningType.ORGANIZATION_IDENTITY_COLLISION,
    metadata: metadata(),
    ...overrides,
  }) as GetSubmissionWarningsResponse[number];

describe("parseCollisionWarnings", () => {
  it("returns an empty array when the query has no data yet", () => {
    expect(parseCollisionWarnings(undefined)).toEqual([]);
    expect(parseCollisionWarnings([])).toEqual([]);
  });

  it("parses a well-formed collision warning into typed metadata", () => {
    const parsed = parseCollisionWarnings([warning()]);

    expect(parsed).toEqual([metadata()]);
  });

  it("drops warnings of an unrecognized type", () => {
    const parsed = parseCollisionWarnings([
      warning({ type: "SOME_FUTURE_WARNING_KIND" }),
    ]);

    expect(parsed).toEqual([]);
  });

  it("drops warnings whose metadata does not match the collision shape", () => {
    const parsed = parseCollisionWarnings([
      // Missing the applicant tuple entirely.
      warning({
        metadata: { collisionState: "APPROVED", organizationId: "1" },
      }),
      // collisionFields must not be empty.
      warning({ metadata: { ...metadata(), collisionFields: [] } }),
      // organizationId must be a numeric string.
      warning({ metadata: { ...metadata(), organizationId: "abc" } }),
    ]);

    expect(parsed).toEqual([]);
  });

  it("keeps the API's ordering and drops only the malformed entries", () => {
    const pending = warning({
      metadata: metadata({
        collisionState: "PENDING",
        organizationId: "7",
        organizationIsAccredited: false,
      }),
    });

    const parsed = parseCollisionWarnings([
      warning(),
      warning({ type: "UNKNOWN" }),
      pending,
    ]);

    expect(parsed.map((entry) => entry.collisionState)).toEqual([
      "APPROVED",
      "PENDING",
    ]);
  });
});
