import { FileStatus } from "@repo/types";
import { InputType, type Prisma } from "@repo/database";
import { CUSTOM_FACTOR_SOURCES } from "@/utils/index.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";
import { tonToKg } from "@/utils/number.js";
import { MissingFilesError } from "@/features/files/errors.js";
import {
  CrossInventoryFileLinkingError,
  FileAlreadyLinkedError,
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
 * Creates a carbon inventory line result with null-safe total emissions calculation
 */
export async function createLineResult(
  tx: Prisma.TransactionClient,
  lineInputId: bigint,
  item: ItemData,
  inputType: InputType,
  userId: bigint | null
) {
  let totalEmissions: Prisma.Decimal | null = null;

  if (inputType === InputType.DIRECT && item.manualTotalEmissions !== null) {
    totalEmissions = mapDecimalField(tonToKg(item.manualTotalEmissions));
  } else if (
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
