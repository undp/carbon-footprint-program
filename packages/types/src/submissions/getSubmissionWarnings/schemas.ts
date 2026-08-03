import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubmissionStatusSchema } from "../../baseSchemas/submission.js";
import { OrganizationDisplayStatusSchema } from "../../organizations/schemas.js";

export const GetSubmissionWarningsParamsSchema = z.object({
  id: IdSchema.describe("The submission ID"),
});

/** Registry of warning `type` identifiers. Extend as new kinds are added. */
export const WarningType = {
  ORGANIZATION_IDENTITY_COLLISION: "ORGANIZATION_IDENTITY_COLLISION",
} as const;

export const WarningTypeSchema = z.enum(WarningType);

/**
 * Generic warning bag (design D2). `metadata` is intentionally free-form — its
 * shape depends on `type`; consumers branch on `type` and parse `metadata` at
 * the render boundary. Keeping it generic lets future submission types add their
 * own warning kinds without changing the response contract.
 *
 * The bag carries STRUCTURE ONLY — no prose. User-facing copy is composed by the
 * client from `metadata`, so the Spanish wording (and its `VOCAB` vocabulary)
 * lives in one place, the front, instead of being duplicated server-side.
 */
export const WarningSchema = z.object({
  type: WarningTypeSchema.describe("Warning kind identifier"),
  metadata: z
    .record(z.string(), z.unknown())
    .describe("Free-form metadata; shape depends on `type`"),
});

export const GetSubmissionWarningsResponseSchema = z.array(WarningSchema);

// --- Organization identity-collision warning (first warning kind) -----------

/**
 * Status of the conflicting submission whose snapshot was compared: `APPROVED` =
 * the accredited snapshot, `PENDING` = a submission still under review. It says
 * nothing about the organization itself — a `PENDING` collision can come from a
 * first-time applicant or from an already-inscribed organization editing its
 * data, which is what `organizationStatus` distinguishes.
 */
export const CollisionStateSchema = z.enum(["APPROVED", "PENDING"]);

/** The three identity fields compared field-to-same-field (design D3). */
export const CollisionFieldSchema = z.enum(["legalName", "tradeName", "taxId"]);

/** The three identity values of one side of a collision. */
export const OrganizationIdentityTupleSchema = z.object({
  taxId: z.string().nullable().describe("Tax ID (RUT/RUC/ID Tributario)"),
  legalName: z.string().describe("Legal name"),
  tradeName: z.string().nullable().describe("Trade name"),
});

/**
 * Typed metadata for an `ORGANIZATION_IDENTITY_COLLISION` warning. Used by the
 * API to build the warning and by the web client as the per-`type` parser/guard
 * at the render boundary (design D2). Exposes the conflicting organization's
 * approved-snapshot tuple, which no other endpoint returns today.
 *
 * `applicant` carries the exact snapshot the API compared, so the client renders
 * both sides of the comparison from one source. Do NOT rebuild the applicant
 * side from the submission-history response: that one exposes the organization's
 * *displayed* snapshot (`organization_summary_view` ranks PENDING above
 * APPROVED), which is not always the snapshot this submission was matched on.
 */
export const OrganizationIdentityCollisionMetadataSchema = z.object({
  collisionState: CollisionStateSchema,
  organizationId: IdSchema.describe("The conflicting organization's ID"),
  organizationStatus: OrganizationDisplayStatusSchema.describe(
    "Standing of the conflicting organization itself, independently of the compared submission's status"
  ),
  taxId: z.string().nullable().describe("Conflicting org tax ID (RUT/RUC/ID)"),
  legalName: z.string().describe("Conflicting org legal name"),
  tradeName: z.string().nullable().describe("Conflicting org trade name"),
  applicant: OrganizationIdentityTupleSchema.extend({
    submissionStatus: SubmissionStatusSchema.describe(
      "Status of the submission under review"
    ),
    organizationStatus: OrganizationDisplayStatusSchema.describe(
      "Standing of the applicant's own organization (an inscribed organization may be editing its data)"
    ),
  }).describe("The applicant snapshot that was actually compared"),
  collisionFields: z
    .array(CollisionFieldSchema)
    .min(1)
    .describe("Which identity fields collided"),
});
