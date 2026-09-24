import { FileStatus } from "@repo/types";
import { EmissionFactorStatus, InputType, type Prisma } from "@repo/database";
import { CUSTOM_FACTOR_SOURCES } from "@/utils/index.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";
import { tonToKg } from "@/utils/number.js";
import { MissingFilesError } from "@/features/files/errors.js";
import { EmissionFactorNotFoundError } from "@/features/emissionFactors/errors.js";
import { attachDetails } from "@/errors/index.js";
import {
  CrossInventoryFileLinkingError,
  EmissionFactorReferenceIssue,
  FileAlreadyLinkedError,
  InvalidEmissionFactorReferenceError,
} from "../errors.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";

export type ItemData = {
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  quantity: number | null;
  measurementUnitId: string | null;
  manualTotalEmissions: number | null;
  appliedFactorValue: number | null;
  factorSource: string | null;
  appliedFactorRateMeasurementUnitId: string | null;
  comment?: string | null;
  baseFactorId: string | null;
};

type ReferencedEmissionFactor = {
  year: number;
  subcategoryId: bigint;
  status: EmissionFactorStatus;
};

/**
 * Reads every emission factor referenced by the payload, keyed by id as a
 * string.
 *
 * This service never queried the factor table before: `createLineFactor`
 * persists the value, the source and the id straight from the request. The
 * lookup exists so each reference can be checked — filtering the capture
 * selector is not enforcing, since a stale client payload would otherwise write
 * a factor the selector no longer offers and the filter would never notice.
 * `assertFactorReferenceIsValid` does the checking.
 *
 * The status is selected rather than filtered on. A deleted factor has to stay
 * in the map so it can be refused as deleted, with a 422: filtered out, it
 * would be indistinguishable from an id that never existed, which is a 404.
 *
 * The referenced ids are always the numeric id of a real `emission_factor` row:
 * `useEmissionEditorForm` sends `factor.originalEmissionFactorId ?? factor.id`,
 * so the composite id of a converted factor (`123-1`) never reaches the
 * payload. Manual-factor lines carry a null `baseFactorId` and never enter the
 * lookup at all.
 *
 * TODO(fix/mati/activity-unit-factor-mismatch): `rateMeasurementUnitId` and the
 * rate unit's `denominatorMeasurementUnit` are selected here although only the
 * year, the subcategory and the status are read, so the postponed unit-mismatch
 * fix — the line's `measurementUnitId` is never cross-checked against the
 * denominator of the applied factor's rate unit, so a `kg/kg` factor over a
 * quantity in tonnes yields a result a thousand times too large — becomes a
 * check added to this query rather than a second round trip.
 */
export async function findReferencedEmissionFactors(
  prisma: Prisma.TransactionClient,
  items: Pick<ItemData, "baseFactorId">[]
): Promise<Map<string, ReferencedEmissionFactor>> {
  const referencedIds = [
    ...new Set(
      items
        .map((item) => item.baseFactorId)
        .filter((id): id is string => id !== null)
    ),
  ];

  if (referencedIds.length === 0) return new Map();

  const factors = await prisma.emissionFactor.findMany({
    where: { id: { in: referencedIds.map((id) => BigInt(id)) } },
    select: {
      id: true,
      year: true,
      subcategoryId: true,
      status: true,
      rateMeasurementUnitId: true,
      rateMeasurementUnit: {
        select: { denominatorMeasurementUnit: { select: { id: true } } },
      },
    },
  });

  return new Map(factors.map((factor) => [factor.id.toString(), factor]));
}

/**
 * Refuses a line that references a catalogue factor this footprint cannot use.
 *
 * An id that matches no factor at all is a 404, `EmissionFactorNotFoundError`
 * — the pattern this endpoint already follows for a subcategory: 404 when the
 * referenced row does not exist, 422 when it exists but cannot be used here.
 *
 * Otherwise three reasons, checked in this order, each answered with the same
 * 422:
 *  - the factor is deleted. The maintainer retired it after the page was
 *    opened, so the selection is stale.
 *  - its year is not the footprint's, a footprint with no year included — it is
 *    offered no factor at all. The year changed in another tab, or the payload
 *    is stale.
 *  - its subcategory is not the line's. Only a crafted payload reaches this:
 *    nothing else ties `baseFactorId` to the line. A subcategory belongs to one
 *    category of one methodology version, and the line's subcategory is already
 *    checked against the footprint's methodology, so this covers the version
 *    too.
 *
 * Refused rather than reconciled. Saving the line without its factor was the
 * earlier answer, and it changed what the user saw without telling them: the
 * cell came back empty on a line they may not have edited, and the only trace
 * was the completeness rules reading it as unfinished. A stale selection is
 * the user's to redo, so the save is refused whole — the transaction has not
 * opened yet — and the client says the catalogue changed and asks for a
 * reload, which brings back the factors that are offered now.
 *
 * Every reference is checked before the transaction opens, so a refused
 * request — 404 or 422 — persists nothing.
 */
export function assertFactorReferenceIsValid(
  item: Pick<ItemData, "baseFactorId">,
  factorsById: Map<string, ReferencedEmissionFactor>,
  footprintYear: number | null,
  lineSubcategoryId: string
): void {
  if (item.baseFactorId === null) return;

  const factor = factorsById.get(item.baseFactorId);
  if (!factor) throw new EmissionFactorNotFoundError(item.baseFactorId);

  const reason =
    factor.status === EmissionFactorStatus.DELETED
      ? EmissionFactorReferenceIssue.DELETED
      : factor.year !== footprintYear
        ? EmissionFactorReferenceIssue.YEAR_MISMATCH
        : factor.subcategoryId.toString() !== lineSubcategoryId
          ? EmissionFactorReferenceIssue.SUBCATEGORY_MISMATCH
          : null;

  if (reason === null) return;

  throw attachDetails(
    new InvalidEmissionFactorReferenceError(item.baseFactorId, reason),
    { emissionFactorId: item.baseFactorId, reason }
  );
}

/**
 * Whether the line's frozen factor may be persisted for this footprint.
 *
 * Runs after `assertFactorReferenceIsValid` has refused every reference that
 * is unknown or stale, so a referenced factor reaching here is one this
 * footprint may use and its snapshot is kept.
 *
 * A null `baseFactorId` is not enough to call a line manual. Three shapes
 * arrive with one:
 *  - nothing frozen yet — a line still being filled in, or a direct-total line
 *    whose emissions were typed rather than computed. `appliedFactorValue` is
 *    null, there is nothing to reconcile, and `createLineFactor`'s own guard
 *    handles it.
 *  - a manual factor, whose source is one of `CUSTOM_FACTOR_SOURCES`. Its value
 *    and source were typed by the user and no catalogue can restore them.
 *  - a value with a *catalogue* source and no id: either a snapshot damaged
 *    before PR 647 preserved the factor identity, or a forged payload. It is
 *    reconciled, not refused — it is not a selection the user made and can
 *    redo, and refusing it would make the whole subcategory unsavable. Treating
 *    it as manual is what would make it permanent: `mapLineToResponse` derives
 *    `baseFactorId` from `emissionFactorId`, so the line round-trips with a null
 *    id and no later save would ever look at it again, while the source keeps
 *    `fieldValidationService` from reading the line as unfinished.
 *
 * The same three-way split is what `clearCatalogueFactorsOfLines` and the
 * migration's `DELETE` predicate encode; the three must agree or a line slips
 * through every one of them.
 *
 * A damaged snapshot is therefore reconciled by any save of its subcategory,
 * including one the user did not aim at it: capture sends every line of the
 * subcategory, so editing one line carries the others along and a damaged
 * neighbour loses its snapshot and its result in the same request. That is the
 * intended end state and not a silent one — the line comes back with an empty
 * «Fuente», which the completeness rules read as unfinished — but nothing says
 * why, and the alternative is worse: keeping it means keeping a factor whose
 * year cannot be checked, on a footprint where the year is what makes a factor
 * applicable. Telling the user which lines a save reconciled would take the
 * endpoint reporting them back, which is a feature, not this guard.
 */
export function isFactorKeptOnLine(
  item: Pick<ItemData, "baseFactorId" | "factorSource" | "appliedFactorValue">
): boolean {
  if (item.baseFactorId !== null) return true;

  if (item.appliedFactorValue === null) return true;

  return CUSTOM_FACTOR_SOURCES.includes(item.factorSource ?? "");
}

/**
 * Creates a carbon inventory line input
 */
export async function createLineInput(
  tx: Prisma.TransactionClient,
  lineId: bigint,
  item: ItemData,
  inputType: InputType,
  userId: bigint | null
) {
  const isCustomFactorSource = CUSTOM_FACTOR_SOURCES.includes(
    item.factorSource ?? ""
  );

  return await tx.carbonInventoryLineInput.create({
    data: {
      lineId,
      inputType,
      selection1Id: mapBigIntField(item.dimensionValue1Id),
      selection2Id: mapBigIntField(item.dimensionValue2Id),
      quantity: item.quantity !== null ? mapDecimalField(item.quantity) : null,
      measurementUnitId: mapBigIntField(item.measurementUnitId),
      directTotalEmissions:
        item.manualTotalEmissions !== null
          ? mapDecimalField(tonToKg(item.manualTotalEmissions))
          : null,
      manualFactor:
        isCustomFactorSource && item.appliedFactorValue !== null
          ? mapDecimalField(item.appliedFactorValue)
          : null,
      manualFactorSource:
        isCustomFactorSource && item.appliedFactorValue !== null
          ? item.factorSource
          : null,
      manualFactorRateUnitId:
        isCustomFactorSource && item.appliedFactorRateMeasurementUnitId !== null
          ? mapBigIntField(item.appliedFactorRateMeasurementUnitId)
          : null,
      comment: item.comment ?? null,
      isActive: true,
      createdById: userId,
      updatedAt: null,
    },
  });
}

/**
 * Creates a carbon inventory line factor with null-safe conversions
 */
export async function createLineFactor(
  tx: Prisma.TransactionClient,
  lineInputId: bigint,
  item: ItemData,
  userId: bigint | null
) {
  // Guard: only create factor if both required fields are present
  if (
    item.appliedFactorValue === null ||
    item.appliedFactorRateMeasurementUnitId === null
  ) {
    return;
  }

  await tx.carbonInventoryLineFactor.create({
    data: {
      lineInputId,
      emissionFactorId: mapBigIntField(item.baseFactorId),
      appliedFactorValue: mapDecimalField(item.appliedFactorValue),
      appliedFactorRateUnitId: mapBigIntField(
        item.appliedFactorRateMeasurementUnitId
      ),
      appliedFactorSource: item.factorSource,
      createdById: userId,
      updatedAt: null,
    },
  });
}

/**
 * Creates a carbon inventory line result with null-safe total emissions
 * calculation.
 *
 * `keepsFactor` gates the computed branch only: a result derived from a factor
 * goes with the snapshot it was computed from, so a line whose factor was
 * reconciled away gets no result either.
 */
export async function createLineResult(
  tx: Prisma.TransactionClient,
  lineInputId: bigint,
  item: ItemData,
  inputType: InputType,
  userId: bigint | null,
  keepsFactor: boolean
) {
  let totalEmissions: Prisma.Decimal | null = null;

  if (inputType === InputType.DIRECT && item.manualTotalEmissions !== null) {
    // A direct total was typed, not computed, so a reconciled factor cannot
    // invalidate it — this branch ignores `keepsFactor` on purpose.
    totalEmissions = mapDecimalField(tonToKg(item.manualTotalEmissions));
  } else if (
    keepsFactor &&
    (inputType === InputType.SIMPLIFIED || inputType === InputType.EXPERT) &&
    item.quantity !== null &&
    item.appliedFactorValue !== null
  ) {
    totalEmissions = mapDecimalField(item.quantity).mul(
      mapDecimalField(item.appliedFactorValue)
    );
  }

  if (totalEmissions !== null) {
    await tx.carbonInventoryLineResult.create({
      data: {
        lineInputId,
        totalEmissions,
        createdById: userId,
        updatedAt: null,
      },
    });
  }
}

/**
 * Links a set of files (by UUID) to a carbon inventory line.
 *
 * Validates each file in two steps:
 *  1. The UUID must resolve to an ACTIVE `File` row — otherwise we throw
 *     `MissingFilesError` (404). This covers typos, already-deleted files,
 *     and unknown UUIDs.
 *  2. The resolved file's `blobPath` must start with
 *     `CARBON_INVENTORY/{inventoryId}/LINES/` — otherwise we throw
 *     `CrossInventoryFileLinkingError` (422). The prefix is set at upload
 *     time and is tamper-resistant, so it blocks a user with access to
 *     inventory A from linking a file uploaded to inventory B.
 *
 * Junction inserts are idempotent (`skipDuplicates: true`) so retries don't
 * fail on existing rows.
 */
export async function linkFilesToCarbonInventoryLine(
  tx: Prisma.TransactionClient,
  lineId: bigint,
  fileUuids: string[],
  userId: bigint | null,
  carbonInventoryId: bigint
): Promise<void> {
  if (fileUuids.length === 0) return;

  // Dedupe before counting matches so a payload that lists the same UUID
  // twice doesn't trip the "missing" check.
  const uniqueFileUuids = [...new Set(fileUuids)];

  const files = await tx.file.findMany({
    where: {
      uuid: { in: uniqueFileUuids },
      status: FileStatus.ACTIVE,
    },
    select: { id: true, uuid: true, blobPath: true },
  });

  if (files.length !== uniqueFileUuids.length) {
    const found = new Set(files.map((file) => file.uuid));
    const missing = uniqueFileUuids.filter((uuid) => !found.has(uuid));
    throw new MissingFilesError(missing.join(", "));
  }

  const expectedPrefix = buildCarbonInventoryLineBlobPathPrefix(
    carbonInventoryId.toString()
  );
  const crossInventory = files.filter(
    (file) => !file.blobPath.startsWith(expectedPrefix)
  );
  if (crossInventory.length > 0) {
    throw new CrossInventoryFileLinkingError(
      carbonInventoryId.toString(),
      crossInventory.map((file) => file.uuid).join(", ")
    );
  }

  // Enforce the one-file-per-line invariant in code as a safety net. A
  // unique constraint on `file_id` in the junction table is the
  // authoritative guarantee (see migration), but checking here lets us
  // return a meaningful error instead of a raw `P2002`.
  const candidateFileIds = files.map((file) => file.id);
  const alreadyLinkedElsewhere = await tx.carbonInventoryLineFile.findMany({
    where: { fileId: { in: candidateFileIds }, NOT: { lineId } },
    select: { fileId: true },
  });
  if (alreadyLinkedElsewhere.length > 0) {
    const otherIds = new Set(
      alreadyLinkedElsewhere.map((row) => row.fileId.toString())
    );
    const conflicting = files
      .filter((file) => otherIds.has(file.id.toString()))
      .map((file) => file.uuid);
    throw new FileAlreadyLinkedError(conflicting.join(", "));
  }

  await tx.carbonInventoryLineFile.createMany({
    data: files.map((file) => ({
      lineId,
      fileId: file.id,
      createdById: userId,
    })),
    skipDuplicates: true,
  });
}

/**
 * Unlinks a set of files (by id) from a carbon inventory line and
 * soft-deletes the corresponding `File` rows. Idempotent — re-running with
 * the same ids is a no-op (missing junction rows or already-DELETED files
 * are silently skipped).
 *
 * The unlink + soft-delete is **scoped to the given `lineId`** — we only
 * touch `File` rows that actually have a junction row pointing at the
 * target line. This prevents a crafted `removeFileIds` payload from
 * soft-deleting files attached to other lines/inventories.
 */
export async function unlinkFilesFromCarbonInventoryLine(
  tx: Prisma.TransactionClient,
  lineId: bigint,
  fileIds: string[]
): Promise<void> {
  if (fileIds.length === 0) return;

  const fileIdBigints = [...new Set(fileIds.map((id) => BigInt(id)))];

  const linkedRows = await tx.carbonInventoryLineFile.findMany({
    where: { lineId, fileId: { in: fileIdBigints } },
    select: { fileId: true },
  });
  const linkedFileIds = linkedRows.map((row) => row.fileId);
  if (linkedFileIds.length === 0) return;

  await tx.carbonInventoryLineFile.deleteMany({
    where: { lineId, fileId: { in: linkedFileIds } },
  });

  await tx.file.updateMany({
    where: { id: { in: linkedFileIds }, status: FileStatus.ACTIVE },
    data: { status: FileStatus.DELETED, deletedAt: new Date() },
  });
}
