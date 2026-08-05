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

/**
 * A candidate snapshot: an identity plus the row id, needed to tell which of an
 * organization's snapshots is its latest (see {@link findOpenReviewedIdentities}).
 */
const CANDIDATE_SNAPSHOT_SELECT = {
  id: true,
  ...ORGANIZATION_IDENTITY_SELECT,
} satisfies Prisma.OrganizationDataSelect;

type CandidateSnapshot = Prisma.OrganizationDataGetPayload<{
  select: typeof CANDIDATE_SNAPSHOT_SELECT;
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

/**
 * An identity with its three fields already normalized — null meaning "not
 * comparable". The applicant is normalized once and reused for the query clause
 * and for every candidate comparison, instead of per candidate row.
 */
type NormalizedIdentity = Record<CollisionField, string | null>;

const normalizeIdentity = (
  identity: OrganizationIdentity
): NormalizedIdentity => ({
  legalName: normalize(identity.legalName),
  tradeName: normalize(identity.tradeName),
  taxId: normalize(identity.taxId),
});

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
  applicant: NormalizedIdentity
): Prisma.OrganizationDataWhereInput[] | null => {
  const clauses = COLLISION_FIELD_ORDER.flatMap((field) => {
    const value = applicant[field];
    return value === null ? [] : [clauseForField(field, value)];
  });

  return clauses.length > 0 ? clauses : null;
};

/**
 * Which of the three identity fields collide between applicant and candidate,
 * in {@link COLLISION_FIELD_ORDER} — the one place that order is defined.
 */
const computeCollisionFields = (
  applicant: NormalizedIdentity,
  candidate: OrganizationIdentity
): CollisionField[] =>
  COLLISION_FIELD_ORDER.filter((field) => {
    const value = applicant[field];
    return value !== null && value === normalize(candidate[field]);
  });

/**
 * The applicant side of every comparison, resolved once: the tuple reported back
 * as-stored, the same tuple normalized for matching, and the two standings the
 * payload carries.
 */
type Applicant = {
  identity: OrganizationIdentity;
  normalized: NormalizedIdentity;
  submissionStatus: SubmissionStatus;
  organizationStatus: OrganizationDisplayStatus;
};

/**
 * Turns the candidate snapshots into warnings, one per snapshot that collides.
 *
 * Each candidate is a whole organization's current identity in this state — its
 * newest approved snapshot, the single pending one, or its open observation round
 * — so a warning's `collisionFields` and its identity tuple always come from the
 * same row and a highlighted field shows two equal values on both sides. There is
 * nothing to merge across snapshots here, which is what previously let a field be
 * reported as matching while the tuple displayed a different value for it.
 */
const buildBranchMetadata = (
  applicant: Applicant,
  candidates: OrganizationIdentity[],
  collisionState: CollisionState,
  organizationStatusOf: (organizationId: bigint) => OrganizationDisplayStatus
): OrganizationIdentityCollisionMetadata[] =>
  candidates
    .map((snapshot) => ({
      snapshot,
      fields: computeCollisionFields(applicant.normalized, snapshot),
    }))
    .filter(({ fields }) => fields.length > 0)
    .map(({ snapshot, fields }) => ({
      collisionState,
      organizationId: snapshot.organizationId.toString(),
      organizationStatus: organizationStatusOf(snapshot.organizationId),
      taxId: snapshot.taxId,
      legalName: snapshot.legalName,
      tradeName: snapshot.tradeName,
      applicant: {
        taxId: applicant.identity.taxId,
        legalName: applicant.identity.legalName,
        tradeName: applicant.identity.tradeName,
        submissionStatus: applicant.submissionStatus,
        organizationStatus: applicant.organizationStatus,
      },
      // Already in COLLISION_FIELD_ORDER, and every field here comes from this
      // one snapshot.
      collisionFields: fields,
    }));

/** Reaches an OrganizationData through an APPROVED/APPROVED_AUTOMATICALLY submission. */
const APPROVED_THROUGH = {
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
} satisfies Prisma.SubmissionSubjectOrganizationDataWhereInput;

/** Reaches an OrganizationData through a PENDING submission. */
const PENDING_THROUGH = {
  subject: { submissions: { some: { status: SubmissionStatus.PENDING } } },
} satisfies Prisma.SubmissionSubjectOrganizationDataWhereInput;

/** Reaches an OrganizationData through a REVIEWED submission (returned with observations). */
const REVIEWED_THROUGH = {
  subject: { submissions: { some: { status: SubmissionStatus.REVIEWED } } },
} satisfies Prisma.SubmissionSubjectOrganizationDataWhereInput;

/**
 * The CURRENT identity of each given organization in one state: its newest ACTIVE
 * snapshot reachable through a submission in that state.
 *
 * An organization accumulates snapshots — approving never marks the previous one
 * OUTDATED (`OUTDATED` is only used for rejected data), and a request returned
 * with observations is re-submitted as a CLONE, so an organization that edited
 * and was re-approved, or that was sent back twice, keeps every version. Only the
 * newest is its identity in that state: `organization_summary_view` resolves the
 * displayed row the same way, `ORDER BY <status priority>, od.id DESC`. The older
 * ones are history, and colliding against them would warn about a name or tax id
 * the organization no longer holds.
 */
const findCurrentIdentities = async (
  prisma: PrismaClient,
  organizationIds: bigint[],
  through: Prisma.SubmissionSubjectOrganizationDataWhereInput
): Promise<CandidateSnapshot[]> => {
  if (organizationIds.length === 0) return [];

  return prisma.organizationData.findMany({
    where: {
      organizationId: { in: organizationIds },
      status: OrganizationDataStatus.ACTIVE,
      submission: through,
    },
    select: CANDIDATE_SNAPSHOT_SELECT,
    // Newest first + one row per organization: the current snapshot in this state.
    orderBy: { id: "desc" },
    distinct: ["organizationId"],
  });
};

/**
 * The newest ACTIVE snapshot each given organization holds among the ones that
 * still stand for it — reachable through an approved, pending or
 * returned-with-observations submission. Rejected data is marked OUTDATED and a
 * draft has no submission at all, so neither can win here.
 */
const findLatestSnapshotIds = async (
  prisma: PrismaClient,
  organizationIds: bigint[]
): Promise<Map<string, bigint>> => {
  if (organizationIds.length === 0) return new Map();

  const rows = await prisma.organizationData.findMany({
    where: {
      organizationId: { in: organizationIds },
      status: OrganizationDataStatus.ACTIVE,
      submission: {
        subject: {
          submissions: {
            some: {
              status: {
                in: [
                  SubmissionStatus.APPROVED,
                  SubmissionStatus.APPROVED_AUTOMATICALLY,
                  SubmissionStatus.PENDING,
                  SubmissionStatus.REVIEWED,
                ],
              },
            },
          },
        },
      },
    },
    select: { id: true, organizationId: true },
    orderBy: { id: "desc" },
    distinct: ["organizationId"],
  });

  return new Map(rows.map((row) => [row.organizationId.toString(), row.id]));
};

/**
 * The reviewed identity of each given organization whose observation round is
 * still OPEN: its newest snapshot returned with observations, kept only while the
 * organization has not moved past it.
 *
 * A returned request is still in the funnel — the organization is expected to fix
 * it and re-submit — so its identity is worth warning about even though nobody is
 * about to approve that snapshot. What must not be reported is a CLOSED round:
 * re-submitting clones the reviewed snapshot into a new PENDING one
 * (`requestOrganizationAccreditation` → `cloneOrganizationData`) and an approval
 * leaves yet another, so reporting the reviewed row too would announce the same
 * identity twice under two states.
 *
 * "Open" is therefore "still the organization's latest snapshot", not "has no
 * approved snapshot": an already-inscribed organization whose EDIT came back with
 * observations keeps that edit visible, because its approved snapshot is older.
 */
const findOpenReviewedIdentities = async (
  prisma: PrismaClient,
  organizationIds: bigint[]
): Promise<CandidateSnapshot[]> => {
  const [reviewed, latestIds] = await Promise.all([
    findCurrentIdentities(prisma, organizationIds, REVIEWED_THROUGH),
    findLatestSnapshotIds(prisma, organizationIds),
  ]);

  return reviewed.filter(
    (row) => latestIds.get(row.organizationId.toString()) === row.id
  );
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
 * - APPROVED: matched against another org's CURRENT approved snapshot — the
 *   newest ACTIVE OrganizationData reachable through an
 *   APPROVED/APPROVED_AUTOMATICALLY submission (the approved snapshot the
 *   summary view never exposes; design D4). Superseded approved snapshots are
 *   history and are not compared ({@link findCurrentApprovedIdentities}).
 * - PENDING: matched against another org's pending submission data. At most one
 *   exists per organization — `updateOrganization` refuses a second edit while
 *   one is under review (`OrganizationUnderReviewError`).
 * - REVIEWED: matched against another org's request returned with observations,
 *   while that round is still open — the organization has not re-submitted or
 *   been approved since ({@link findOpenReviewedIdentities}).
 *
 * Each state therefore contributes at most one warning per organization, built
 * from one real snapshot. An org may still yield two warnings — its approved
 * identity plus the state its latest snapshot sits in (kept separate, never
 * merged, design D7); warnings are ordered APPROVED, PENDING, REVIEWED.
 */
export const getOrganizationIdentityCollisionWarnings = async (
  prisma: PrismaClient,
  applicant: OrganizationIdentity,
  applicantSubmissionStatus: SubmissionStatus
): Promise<GetSubmissionWarningsResponse> => {
  // Normalized once here: it feeds both the query clause and every candidate
  // comparison, so re-deriving it per candidate row was pure repetition.
  const normalizedApplicant = normalizeIdentity(applicant);

  const fieldMatch = buildFieldMatchClause(normalizedApplicant);
  if (fieldMatch === null) return []; // applicant has no comparable identity field

  const otherActiveOrg: Prisma.OrganizationDataWhereInput = {
    status: OrganizationDataStatus.ACTIVE,
    organizationId: { not: applicant.organizationId },
  };

  // Which OTHER organizations have any matching snapshot in each state. For the
  // states resolved per organization (approved, reviewed), only the ids: which
  // snapshot matched is not the question, since the comparison runs against each
  // organization's CURRENT snapshot in that state below.
  const [approvedCandidateOrgs, pendingRows, reviewedCandidateOrgs] =
    await Promise.all([
      prisma.organizationData.findMany({
        where: {
          ...otherActiveOrg,
          OR: fieldMatch,
          submission: APPROVED_THROUGH,
        },
        select: { organizationId: true },
        distinct: ["organizationId"],
      }),
      prisma.organizationData.findMany({
        where: {
          ...otherActiveOrg,
          OR: fieldMatch,
          submission: PENDING_THROUGH,
        },
        select: ORGANIZATION_IDENTITY_SELECT,
        orderBy: { id: "desc" },
      }),
      prisma.organizationData.findMany({
        where: {
          ...otherActiveOrg,
          OR: fieldMatch,
          submission: REVIEWED_THROUGH,
        },
        select: { organizationId: true },
        distinct: ["organizationId"],
      }),
    ]);

  // The candidate organizations' CURRENT identity in each state — the newest
  // snapshot each one holds there, resolved WITHOUT the field filter.
  //
  // Filtering first and then taking the newest of what matched would still hand
  // back a superseded snapshot: if an org's current approved taxId is 222 and an
  // older approved snapshot carried 111, an applicant with 111 matches only the
  // older row, and reporting it claims the org is registered under a tax id it no
  // longer holds. Re-reading here can legitimately find no collision at all, and
  // that is the correct answer.
  //
  // No false negatives: an org whose current snapshot collides necessarily has a
  // matching snapshot, so it is in the candidate set.
  const [approvedRows, reviewedRows] = await Promise.all([
    findCurrentIdentities(
      prisma,
      approvedCandidateOrgs.map((row) => row.organizationId),
      APPROVED_THROUGH
    ),
    findOpenReviewedIdentities(
      prisma,
      reviewedCandidateOrgs.map((row) => row.organizationId)
    ),
  ]);

  // No candidate at all: nothing to report, and no reason to look up standings.
  if (
    approvedRows.length === 0 &&
    pendingRows.length === 0 &&
    reviewedRows.length === 0
  ) {
    return [];
  }

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
    ...reviewedRows.map((row) => row.organizationId),
  ]);

  // An organization always has a summary row, so a miss is unreachable; falling
  // back to NOT_ACCREDITED keeps the function total without ever claiming a
  // standing we did not read.
  const statusOf = (organizationId: bigint): OrganizationDisplayStatus =>
    organizationStatuses.get(organizationId.toString()) ??
    OrganizationDisplayStatusValues.NOT_ACCREDITED;

  const applicantSide: Applicant = {
    identity: applicant,
    normalized: normalizedApplicant,
    submissionStatus: applicantSubmissionStatus,
    organizationStatus: statusOf(applicant.organizationId),
  };

  // APPROVED, then PENDING, then REVIEWED (collision-warning ordering
  // requirement): the registry first, then what is under adjudication, then what
  // is waiting on the organization.
  const metadata = [
    ...buildBranchMetadata(applicantSide, approvedRows, "APPROVED", statusOf),
    ...buildBranchMetadata(applicantSide, pendingRows, "PENDING", statusOf),
    ...buildBranchMetadata(applicantSide, reviewedRows, "REVIEWED", statusOf),
  ];

  // Structure only, no prose: the Spanish sentence is composed by the client
  // from this metadata, where the `VOCAB` vocabulary already lives.
  return metadata.map((entry) => ({
    type: WarningType.ORGANIZATION_IDENTITY_COLLISION,
    metadata: entry,
  }));
};
