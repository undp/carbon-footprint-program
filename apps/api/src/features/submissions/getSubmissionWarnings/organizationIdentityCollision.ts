import type { Prisma, PrismaClient } from "@repo/database";
import { OrganizationDataStatus, SubmissionStatus } from "@repo/database";
import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import {
  CollisionField,
  CollisionState,
  GetSubmissionWarningsResponse,
  OrganizationIdentityCollisionMetadata,
  WarningType,
} from "@repo/types";

/**
 * Identity-collision detection for `ORGANIZATION_ACCREDITATION` submissions —
 * the first (and currently only) warning kind of `GET /admin/submissions/:id/warnings`.
 *
 * Everything organization-specific lives here so `service.ts` keeps nothing but
 * the generic dispatch by `submission.type`. A second warning kind (carbon
 * inventories, reduction projects) gets its own sibling file; whatever turns out
 * to be genuinely shared is promoted then, once the reuse is observed rather
 * than guessed.
 *
 * Only the symbols that cross this file's boundary are prefixed — inside the
 * module the filename already says "organization".
 */

/**
 * The three identity fields compared on both sides of a collision. Shared with
 * the service so the applicant snapshot and the candidate rows are read through
 * the same select — adding or removing a field here fails at the definition.
 */
export const ORGANIZATION_IDENTITY_SELECT = {
  organizationId: true,
  legalName: true,
  tradeName: true,
  taxId: true,
} satisfies Prisma.OrganizationDataSelect;

/**
 * An organization-data identity tuple, derived from
 * {@link ORGANIZATION_IDENTITY_SELECT}.
 */
export type OrganizationIdentity = Prisma.OrganizationDataGetPayload<{
  select: typeof ORGANIZATION_IDENTITY_SELECT;
}>;

/** Field order used for stable message/display output (design D9). */
const COLLISION_FIELD_ORDER = [
  "legalName",
  "tradeName",
  "taxId",
] as const satisfies readonly CollisionField[];

const FIELD_LABELS: Record<CollisionField, string> = {
  legalName: "razón social",
  tradeName: "nombre comercial",
  taxId: TAX_ID_LABEL_SHORT,
};

/**
 * Generic, multi-country normalization for matching (design D8): trim +
 * case-insensitive only. NO Chile-specific RUT logic (no dot/hyphen stripping,
 * no verifier digit) — `taxId` is a generic string (RUT/RUC/ID Tributario).
 * Cross-format tax IDs ("76.123.456-7" vs "761234567") are a documented
 * deferred limitation. Empty/whitespace-only values normalize to null (skipped).
 *
 * Deliberately local and unexported: identity matching is the only caller today,
 * and the "blank is not an identity" rule is a decision of this comparison, not
 * of string handling in general. Promote it (next to
 * `@/helpers/normalizeDescriptionInput`) when a second caller actually appears.
 */
const normalize = (value: string | null): string | null => {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.toLowerCase();
};

/**
 * Per-field prefilter clauses: `equals` OR `contains`, both case-insensitive.
 *
 * `equals` alone is not enough — stored values are never trimmed at write time,
 * so it silently misses a candidate saved as `"Acme SpA "` even though the
 * design mandates whitespace-trimmed matching. `contains` covers the padded
 * rows, and keeping `equals` alongside it makes the filter a provable superset
 * of plain equality: `contains` compiles to `LIKE '%value%'` and Prisma does not
 * escape LIKE metacharacters, so a value carrying a backslash would otherwise
 * change meaning inside the pattern.
 */
const clausesForField = (
  field: CollisionField,
  value: string
): Prisma.OrganizationDataWhereInput[] => {
  const exact = { equals: value, mode: "insensitive" } as const;
  const loose = { contains: value, mode: "insensitive" } as const;

  switch (field) {
    case "legalName":
      return [{ legalName: exact }, { legalName: loose }];
    case "tradeName":
      return [{ tradeName: exact }, { tradeName: loose }];
    case "taxId":
      return [{ taxId: exact }, { taxId: loose }];
  }
};

/**
 * Builds the candidate PREFILTER over the applicant's non-null identity fields.
 * It is deliberately loose — it also returns superstrings ("Acme SpA de Chile")
 * and treats `%`/`_` in the applicant's value as wildcards — because
 * `computeCollisionFields` below decides the actual collision with trimmed,
 * exact equality on both sides. Loose here, exact there: no false negatives on
 * padding, no false positives either.
 *
 * Returns null when the applicant has no comparable field (caller skips).
 */
const buildFieldMatchClause = (
  applicant: OrganizationIdentity
): Prisma.OrganizationDataWhereInput[] | null => {
  const clauses = COLLISION_FIELD_ORDER.flatMap((field) => {
    const value = normalize(applicant[field]);
    return value === null ? [] : clausesForField(field, value);
  });

  return clauses.length > 0 ? clauses : null;
};

/** Which of the three identity fields collide between applicant and candidate. */
const computeCollisionFields = (
  applicant: OrganizationIdentity,
  candidate: OrganizationIdentity
): CollisionField[] => {
  const fields: CollisionField[] = [];
  const legalName = normalize(applicant.legalName);
  const tradeName = normalize(applicant.tradeName);
  const taxId = normalize(applicant.taxId);

  if (legalName !== null && legalName === normalize(candidate.legalName)) {
    fields.push("legalName");
  }
  if (tradeName !== null && tradeName === normalize(candidate.tradeName)) {
    fields.push("tradeName");
  }
  if (taxId !== null && taxId === normalize(candidate.taxId)) {
    fields.push("taxId");
  }

  return fields;
};

/**
 * Groups matching candidate rows into one warning per conflicting organization.
 * An organization can have several ACTIVE snapshots in the same state (approval
 * never marks a prior approved snapshot OUTDATED), so the colliding fields are
 * unioned across an org's matching snapshots and the representative tuple is the
 * most recent one — candidates arrive ordered by `id` desc, making both the
 * representative and the warning order deterministic across requests.
 */
const buildBranchMetadata = (
  applicant: OrganizationIdentity,
  applicantSubmissionStatus: SubmissionStatus,
  applicantIsAccredited: boolean,
  candidates: OrganizationIdentity[],
  collisionState: CollisionState,
  isAccredited: (organizationId: bigint) => boolean
): OrganizationIdentityCollisionMetadata[] => {
  const byOrg = new Map<
    string,
    { representative: OrganizationIdentity; fields: Set<CollisionField> }
  >();

  for (const candidate of candidates) {
    const fields = computeCollisionFields(applicant, candidate);
    // The prefilter is intentionally loose (see buildFieldMatchClause), so rows
    // that only matched as a substring are dropped right here.
    if (fields.length === 0) continue;

    const key = candidate.organizationId.toString();
    const existing = byOrg.get(key);
    if (existing) {
      fields.forEach((field) => existing.fields.add(field));
    } else {
      byOrg.set(key, { representative: candidate, fields: new Set(fields) });
    }
  }

  return [...byOrg.values()].map(({ representative, fields }) => ({
    collisionState,
    organizationId: representative.organizationId.toString(),
    organizationIsAccredited: isAccredited(representative.organizationId),
    taxId: representative.taxId,
    legalName: representative.legalName,
    tradeName: representative.tradeName,
    applicant: {
      taxId: applicant.taxId,
      legalName: applicant.legalName,
      tradeName: applicant.tradeName,
      submissionStatus: applicantSubmissionStatus,
      organizationIsAccredited: applicantIsAccredited,
    },
    collisionFields: COLLISION_FIELD_ORDER.filter((field) => fields.has(field)),
  }));
};

/** Joins field labels with commas and a final "y" (e.g. "razón social y RUT"). */
const joinFieldLabels = (fields: CollisionField[]): string => {
  const labels = fields.map((field) => FIELD_LABELS[field]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
};

/**
 * Spanish one-line summary (design D9): names the conflicting POSTULATION and
 * then the organization behind it. Falls back to the legal name when taxId is
 * null. The organization clause branches on `organizationIsAccredited`, not on
 * the collision state — a pending collision usually comes from an organization
 * that is not inscribed yet, and calling it inscribed would simply be false.
 */
const buildMessage = (
  metadata: OrganizationIdentityCollisionMetadata
): string => {
  const campos = joinFieldLabels(metadata.collisionFields);
  const identity =
    metadata.taxId !== null
      ? `${TAX_ID_LABEL_SHORT} ${metadata.taxId}`
      : `«${metadata.legalName}»`;
  const postulacion =
    metadata.collisionState === "APPROVED"
      ? "la postulación aprobada"
      : "la postulación pendiente";
  const organizacion = metadata.organizationIsAccredited
    ? `la organización inscrita (${identity})`
    : `una organización no inscrita (${identity})`;
  return `Coincide con ${postulacion} de ${organizacion} en ${campos}.`;
};

/**
 * Which of the given organizations are accredited, read from the flag the
 * summary view already materializes (`is_accredited`). Returns an empty set
 * without touching the database when there is nothing to look up.
 */
const findAccreditedOrganizationIds = async (
  prisma: PrismaClient,
  organizationIds: bigint[]
): Promise<Set<string>> => {
  if (organizationIds.length === 0) return new Set();

  const rows = await prisma.organizationSummaryView.findMany({
    where: { organizationId: { in: organizationIds }, isAccredited: true },
    select: { organizationId: true },
  });

  return new Set(rows.map((row) => row.organizationId.toString()));
};

/**
 * Detects identity collisions (legalName / tradeName / taxId, field-to-same-field,
 * exact case-insensitive, trimmed on both sides) between the accreditation
 * applicant and other organizations, excluding the applicant's own organization.
 *
 * - APPROVED: matched against another org's approved snapshot — an ACTIVE
 *   OrganizationData linked to an APPROVED/APPROVED_AUTOMATICALLY submission
 *   (the approved snapshot the summary view never exposes; design D4).
 * - PENDING: matched against another org's pending submission data.
 *
 * One org may yield two warnings (APPROVED + PENDING) if it collides in both
 * states — kept separate, never merged (design D7). APPROVED warnings are
 * ordered before PENDING.
 */
export const getOrganizationIdentityCollisionWarnings = async (
  prisma: PrismaClient,
  applicant: OrganizationIdentity,
  applicantSubmissionStatus: SubmissionStatus
): Promise<GetSubmissionWarningsResponse> => {
  const fieldMatch = buildFieldMatchClause(applicant);
  if (fieldMatch === null) return []; // applicant has no comparable identity field

  const otherActiveOrg: Prisma.OrganizationDataWhereInput = {
    status: OrganizationDataStatus.ACTIVE,
    organizationId: { not: applicant.organizationId },
    OR: fieldMatch,
  };

  const [approvedRows, pendingRows] = await Promise.all([
    prisma.organizationData.findMany({
      where: {
        ...otherActiveOrg,
        submission: {
          subject: {
            submissions: {
              some: {
                status: {
                  in: [
                    SubmissionStatus.APPROVED,
                    SubmissionStatus.APPROVED_AUTOMATICALLY,
                  ],
                },
              },
            },
          },
        },
      },
      select: ORGANIZATION_IDENTITY_SELECT,
      orderBy: { id: "desc" },
    }),
    prisma.organizationData.findMany({
      where: {
        ...otherActiveOrg,
        submission: {
          subject: {
            submissions: { some: { status: SubmissionStatus.PENDING } },
          },
        },
      },
      select: ORGANIZATION_IDENTITY_SELECT,
      orderBy: { id: "desc" },
    }),
  ]);

  // No candidate at all: nothing to report, and no reason to look up standings.
  if (approvedRows.length === 0 && pendingRows.length === 0) return [];

  // A candidate from the approved branch is accredited by construction — it
  // matched THROUGH an approved submission. A pending candidate may or may not
  // be, and neither may the applicant's own organization (an inscribed
  // organization editing its data collides as a pending applicant), so ask the
  // view that already materializes the flag. (Only the boolean is read here: the
  // view's displayed snapshot is still off-limits per design D4.)
  const accreditedOrgIds = await findAccreditedOrganizationIds(prisma, [
    applicant.organizationId,
    ...pendingRows.map((row) => row.organizationId),
  ]);
  const applicantIsAccredited = accreditedOrgIds.has(
    applicant.organizationId.toString()
  );

  // APPROVED before PENDING (collision-warning ordering requirement).
  const metadata = [
    ...buildBranchMetadata(
      applicant,
      applicantSubmissionStatus,
      applicantIsAccredited,
      approvedRows,
      "APPROVED",
      () => true
    ),
    ...buildBranchMetadata(
      applicant,
      applicantSubmissionStatus,
      applicantIsAccredited,
      pendingRows,
      "PENDING",
      (organizationId) => accreditedOrgIds.has(organizationId.toString())
    ),
  ];

  return metadata.map((entry) => ({
    type: WarningType.ORGANIZATION_IDENTITY_COLLISION,
    message: buildMessage(entry),
    metadata: entry,
  }));
};
