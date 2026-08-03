import type { Prisma, PrismaClient } from "@repo/database";
import { OrganizationDataStatus, SubmissionStatus } from "@repo/database";
import {
  CollisionField,
  CollisionState,
  GetSubmissionWarningsResponse,
  OrganizationDisplayStatus,
  OrganizationDisplayStatusValues,
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

/** Field order used for stable metadata/display output (design D9). */
const COLLISION_FIELD_ORDER = [
  "legalName",
  "tradeName",
  "taxId",
] as const satisfies readonly CollisionField[];

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

/** Case-insensitive exact-equality clause for one identity field. */
const clauseForField = (
  field: CollisionField,
  value: string
): Prisma.OrganizationDataWhereInput => {
  const equals = { equals: value, mode: "insensitive" } as const;

  switch (field) {
    case "legalName":
      return { legalName: equals };
    case "tradeName":
      return { tradeName: equals };
    case "taxId":
      return { taxId: equals };
  }
};

/**
 * Builds the candidate filter over the applicant's non-null identity fields:
 * case-insensitive equality, one clause per field, OR-ed.
 *
 * Equality is enough because `OrganizationMutationDataSchema` trims every
 * identity field before it is stored, so both sides are already whitespace-free
 * — the applicant's value through `normalize` here, the candidate's at write
 * time. A `contains` prefilter (the earlier approach, to rescue padded rows)
 * compiles to an unindexable `ILIKE '%value%'` that returns every row sharing a
 * substring — the whole table for a one-character name — and Prisma does not
 * escape LIKE metacharacters, so a `%` in the applicant's value matched
 * everything. Rows written outside the contract (seeds, scripts) must be trimmed
 * at their own source.
 *
 * `computeCollisionFields` below still decides WHICH fields collided, since this
 * clause only says "at least one did".
 *
 * Returns null when the applicant has no comparable field (caller skips).
 */
const buildFieldMatchClause = (
  applicant: OrganizationIdentity
): Prisma.OrganizationDataWhereInput[] | null => {
  const clauses = COLLISION_FIELD_ORDER.flatMap((field) => {
    const value = normalize(applicant[field]);
    return value === null ? [] : [clauseForField(field, value)];
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

/** One colliding candidate snapshot, with the fields it collides on. */
type CollisionMatch = {
  snapshot: OrganizationIdentity;
  fields: CollisionField[];
};

/** Whether every field of `subset` is also in `superset`. */
const isCoveredBy = (
  subset: CollisionField[],
  superset: CollisionField[]
): boolean => subset.every((field) => superset.includes(field));

/**
 * Reduces one organization's colliding snapshots to those whose collision set is
 * MAXIMAL, dropping any snapshot whose fields another kept snapshot already
 * covers.
 *
 * Each surviving warning therefore reports one real snapshot: its
 * `collisionFields` and its identity tuple come from the same row, so a
 * highlighted field always shows two equal values. Unioning the fields across an
 * org's snapshots while keeping only the newest tuple broke exactly that — with
 * v1 `{Foo, 111}` and v2 `{Foo, 222}` both ACTIVE+APPROVED and an applicant
 * `{Foo, 111}`, `taxId` entered the union through v1 while the tuple came from
 * v2, and the grid highlighted a "match" reading 111 against 222.
 *
 * An org holding several ACTIVE snapshots in one state is normal, not an edge
 * case: approving never marks the prior approved snapshot OUTDATED.
 *
 * Snapshots colliding on disjoint field sets each keep their own warning — two
 * consistent warnings beat one merged-but-false warning. Duplicated or dominated
 * sets collapse, so identical snapshots do not produce identical warnings.
 */
const keepMaximalMatches = (matches: CollisionMatch[]): CollisionMatch[] => {
  // Most complete first. `matches` arrives newest-first (candidates are read
  // `id` desc) and the sort is stable, so between equally complete snapshots the
  // newest survives and the output order is deterministic across requests.
  const byCompleteness = [...matches].sort(
    (a, b) => b.fields.length - a.fields.length
  );

  const kept: CollisionMatch[] = [];
  for (const match of byCompleteness) {
    const alreadyCovered = kept.some((keptMatch) =>
      isCoveredBy(match.fields, keptMatch.fields)
    );
    if (!alreadyCovered) kept.push(match);
  }

  return kept;
};

/**
 * Turns the matching candidate rows into warnings, grouped by organization so
 * that redundant snapshots of the same org collapse (see
 * {@link keepMaximalMatches}).
 */
const buildBranchMetadata = (
  applicant: OrganizationIdentity,
  applicantSubmissionStatus: SubmissionStatus,
  applicantStatus: OrganizationDisplayStatus,
  candidates: OrganizationIdentity[],
  collisionState: CollisionState,
  organizationStatusOf: (organizationId: bigint) => OrganizationDisplayStatus
): OrganizationIdentityCollisionMetadata[] => {
  const byOrg = new Map<string, CollisionMatch[]>();

  for (const candidate of candidates) {
    const fields = computeCollisionFields(applicant, candidate);
    if (fields.length === 0) continue;

    const key = candidate.organizationId.toString();
    const matches = byOrg.get(key);
    if (matches) {
      matches.push({ snapshot: candidate, fields });
    } else {
      byOrg.set(key, [{ snapshot: candidate, fields }]);
    }
  }

  return [...byOrg.values()]
    .flatMap(keepMaximalMatches)
    .map(({ snapshot, fields }) => ({
      collisionState,
      organizationId: snapshot.organizationId.toString(),
      organizationStatus: organizationStatusOf(snapshot.organizationId),
      taxId: snapshot.taxId,
      legalName: snapshot.legalName,
      tradeName: snapshot.tradeName,
      applicant: {
        taxId: applicant.taxId,
        legalName: applicant.legalName,
        tradeName: applicant.tradeName,
        submissionStatus: applicantSubmissionStatus,
        organizationStatus: applicantStatus,
      },
      // Already in COLLISION_FIELD_ORDER: computeCollisionFields pushes in that
      // order, and every field here comes from this one snapshot.
      collisionFields: fields,
    }));
};

/**
 * The standing of each given organization, read from the `display_status` the
 * summary view already materializes. Returns an empty map without touching the
 * database when there is nothing to look up.
 *
 * `display_status` rather than `is_accredited`: the latter is blind to BLOCKED
 * (a blocked organization keeps its approved snapshot, so it reads accredited),
 * which would label a blocked conflict "Inscrita".
 */
const findOrganizationStatuses = async (
  prisma: PrismaClient,
  organizationIds: bigint[]
): Promise<Map<string, OrganizationDisplayStatus>> => {
  if (organizationIds.length === 0) return new Map();

  const rows = await prisma.organizationSummaryView.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { organizationId: true, displayStatus: true },
  });

  return new Map(
    rows.map((row) => [row.organizationId.toString(), row.displayStatus])
  );
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
 * One org may yield more than one warning — one per state it collides in
 * (APPROVED + PENDING, kept separate and never merged, design D7) and, within a
 * state, one per snapshot whose colliding fields no other snapshot of that org
 * covers ({@link keepMaximalMatches}). Every warning reports a single real
 * snapshot. APPROVED warnings are ordered before PENDING.
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

  // Every organization involved needs its own standing looked up, the approved
  // branch included: matching THROUGH an approved submission proves the snapshot
  // is the approved one, NOT that the organization is in good standing — a
  // BLOCKED organization keeps its approved snapshot and would otherwise be
  // reported as inscribed. Same for the applicant's own organization, which may
  // already be inscribed and merely editing its data. (Only the standing is read
  // here: the view's displayed snapshot stays off-limits per design D4.)
  const organizationStatuses = await findOrganizationStatuses(prisma, [
    applicant.organizationId,
    ...approvedRows.map((row) => row.organizationId),
    ...pendingRows.map((row) => row.organizationId),
  ]);

  // An organization always has a summary row, so a miss is unreachable; falling
  // back to NOT_ACCREDITED keeps the function total without ever claiming a
  // standing we did not read.
  const statusOf = (organizationId: bigint): OrganizationDisplayStatus =>
    organizationStatuses.get(organizationId.toString()) ??
    OrganizationDisplayStatusValues.NOT_ACCREDITED;

  // APPROVED before PENDING (collision-warning ordering requirement).
  const metadata = [
    ...buildBranchMetadata(
      applicant,
      applicantSubmissionStatus,
      statusOf(applicant.organizationId),
      approvedRows,
      "APPROVED",
      statusOf
    ),
    ...buildBranchMetadata(
      applicant,
      applicantSubmissionStatus,
      statusOf(applicant.organizationId),
      pendingRows,
      "PENDING",
      statusOf
    ),
  ];

  // Structure only, no prose: the Spanish sentence is composed by the client
  // from this metadata, where the `VOCAB` vocabulary already lives.
  return metadata.map((entry) => ({
    type: WarningType.ORGANIZATION_IDENTITY_COLLISION,
    metadata: entry,
  }));
};
