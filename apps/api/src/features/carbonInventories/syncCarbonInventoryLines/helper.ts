import {
  EmissionFactorStatus,
  FactorSelectionType,
  FileStatus,
  type FactorSelection,
} from "@repo/types";
import { InputType, Prisma } from "@repo/database";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";
import { tonToKg } from "@/utils/number.js";
import { MissingFilesError } from "@/features/files/errors.js";
import {
  isSameMagnitudeFamily,
  resolveRateUnitMagnitudeFamily,
} from "@/features/measurementUnits/helpers.js";
import {
  CatalogEmissionFactorDimensionMismatchError,
  CatalogEmissionFactorNotFoundError,
  CatalogEmissionFactorNotInMethodologyError,
  CatalogEmissionFactorUnitFamilyMismatchError,
  CrossInventoryFileLinkingError,
  FileAlreadyLinkedError,
} from "../errors.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";
import { convertEmissionFactorValueDecimal } from "../getCarbonInventoryMethodology/helper.js";

export type ItemData = {
  dimensionValue1Id: string | null;
  dimensionValue2Id: string | null;
  quantity: number | null;
  measurementUnitId: string | null;
  comment?: string | null;
  factorSelection: FactorSelection | null;
};

/**
 * Everything a line needs to persist about its factor, all of it server-derived
 * for a CATALOG selection.
 *
 * `emissionFactorId` and `appliedFactorYear` are set only for a catalog factor:
 * a custom factor has no catalog identity and no vintage, and a direct total has
 * no factor at all. That is what keeps the year-mismatch warning from ever firing
 * on a line the organization did not take from the catalog.
 */
export type ResolvedFactor = {
  emissionFactorId: bigint | null;
  appliedFactorValue: Prisma.Decimal;
  appliedFactorRateUnitId: bigint;
  appliedFactorSource: string;
  appliedFactorYear: number | null;
  /** Set only for CUSTOM, which stores its factor on the line input itself. */
  manual: {
    value: Prisma.Decimal;
    source: string;
    rateUnitId: bigint;
  } | null;
};

/**
 * Loads the selected catalog factor and derives its applied snapshot.
 *
 * The client sends an identity and the unit it wants the factor in; nothing
 * else. Value, source and year are read from the row, and the conversion into the
 * requested unit happens here, so a request cannot persist a number that
 * disagrees with the catalog.
 *
 * Four things are checked, in the order a wrong request is most likely to fail:
 * the factor exists and is ACTIVE; it belongs to this inventory's methodology
 * version *and* to the line's subcategory; its required dimension values match
 * the line's selections; and the requested applied unit shares the factor's
 * numerator/denominator magnitude family, because a conversion across families
 * is not a conversion at all.
 */
export async function resolveCatalogFactor(
  tx: Prisma.TransactionClient,
  selection: Extract<FactorSelection, { type: "CATALOG" }>,
  context: {
    methodologyVersionId: bigint | null;
    subcategoryId: bigint;
    dimensionValue1Id: bigint | null;
    dimensionValue2Id: bigint | null;
  }
): Promise<ResolvedFactor> {
  const emissionFactorId = BigInt(selection.emissionFactorId);

  const factor = await tx.emissionFactor.findFirst({
    where: {
      id: emissionFactorId,
      status: EmissionFactorStatus.ACTIVE,
    },
    select: {
      id: true,
      subcategoryId: true,
      dimensionValue1Id: true,
      dimensionValue2Id: true,
      source: true,
      year: true,
      value: true,
      rateMeasurementUnitId: true,
      numeratorMagnitudeId: true,
      denominatorMagnitudeId: true,
      subcategory: {
        select: { category: { select: { methodologyVersionId: true } } },
      },
      rateMeasurementUnit: {
        select: {
          numeratorMeasurementUnit: { select: { baseFactor: true } },
          denominatorMeasurementUnit: { select: { baseFactor: true } },
        },
      },
    },
  });

  if (!factor) {
    throw new CatalogEmissionFactorNotFoundError(selection.emissionFactorId);
  }

  if (
    factor.subcategoryId !== context.subcategoryId ||
    factor.subcategory.category.methodologyVersionId !==
      context.methodologyVersionId
  ) {
    throw new CatalogEmissionFactorNotInMethodologyError(
      selection.emissionFactorId
    );
  }

  // Only the dimensions the subcategory requires take part: an optional slot is
  // not part of the factor's identity, so it must not be able to reject a valid
  // selection either.
  const requiredPositions = new Set(
    (
      await tx.emissionFactorDimension.findMany({
        where: {
          subcategoryId: context.subcategoryId,
          isRequired: true,
          status: "ACTIVE",
        },
        select: { position: true },
      })
    ).map((dimension) => dimension.position)
  );

  if (
    (requiredPositions.has(1) &&
      factor.dimensionValue1Id !== context.dimensionValue1Id) ||
    (requiredPositions.has(2) &&
      factor.dimensionValue2Id !== context.dimensionValue2Id)
  ) {
    throw new CatalogEmissionFactorDimensionMismatchError(
      selection.emissionFactorId
    );
  }

  const appliedRateUnitId = BigInt(selection.appliedRateMeasurementUnitId);
  const appliedFamily = await resolveRateUnitMagnitudeFamily(
    tx,
    appliedRateUnitId
  );

  if (!isSameMagnitudeFamily(appliedFamily, factor)) {
    throw new CatalogEmissionFactorUnitFamilyMismatchError(
      selection.emissionFactorId
    );
  }

  const appliedValue =
    appliedRateUnitId === factor.rateMeasurementUnitId
      ? factor.value
      : await convertToRateUnit(tx, factor, appliedRateUnitId);

  return {
    emissionFactorId: factor.id,
    appliedFactorValue: appliedValue,
    appliedFactorRateUnitId: appliedRateUnitId,
    appliedFactorSource: factor.source,
    appliedFactorYear: factor.year,
    manual: null,
  };
}

async function convertToRateUnit(
  tx: Prisma.TransactionClient,
  factor: {
    value: Prisma.Decimal;
    rateMeasurementUnit: {
      numeratorMeasurementUnit: { baseFactor: number };
      denominatorMeasurementUnit: { baseFactor: number };
    };
  },
  appliedRateUnitId: bigint
): Promise<Prisma.Decimal> {
  const target = await tx.rateMeasurementUnit.findUnique({
    where: { id: appliedRateUnitId },
    select: {
      numeratorMeasurementUnit: { select: { baseFactor: true } },
      denominatorMeasurementUnit: { select: { baseFactor: true } },
    },
  });

  // resolveRateUnitMagnitudeFamily already proved the unit exists, so a miss
  // here would mean the row vanished mid-transaction.
  if (!target)
    throw new CatalogEmissionFactorNotFoundError(appliedRateUnitId.toString());

  // Decimal all the way: this value is persisted as the applied snapshot and
  // multiplied into the stored result, so a rounding here is permanent.
  return convertEmissionFactorValueDecimal(
    factor.value,
    factor.rateMeasurementUnit.numeratorMeasurementUnit.baseFactor,
    factor.rateMeasurementUnit.denominatorMeasurementUnit.baseFactor,
    target.numeratorMeasurementUnit.baseFactor,
    target.denominatorMeasurementUnit.baseFactor
  );
}

/**
 * Resolves whichever factor variant the line declared.
 *
 * Returns `null` when the line has no factor yet (still being filled in) or when
 * it declared a direct total, which is stored on the line input and never
 * produces a catalog-factor snapshot.
 */
export async function resolveFactorSelection(
  tx: Prisma.TransactionClient,
  item: ItemData,
  context: {
    methodologyVersionId: bigint | null;
    subcategoryId: bigint;
  }
): Promise<ResolvedFactor | null> {
  const selection = item.factorSelection;
  if (selection === null) return null;

  switch (selection.type) {
    case FactorSelectionType.CATALOG:
      return await resolveCatalogFactor(tx, selection, {
        ...context,
        dimensionValue1Id: mapBigIntField(item.dimensionValue1Id),
        dimensionValue2Id: mapBigIntField(item.dimensionValue2Id),
      });

    case FactorSelectionType.CUSTOM: {
      const rateUnitId = BigInt(selection.rateMeasurementUnitId);
      // Validates existence; a custom factor has no family to match against.
      await resolveRateUnitMagnitudeFamily(tx, rateUnitId);
      const value = mapDecimalField(selection.value);
      return {
        emissionFactorId: null,
        appliedFactorValue: value,
        appliedFactorRateUnitId: rateUnitId,
        appliedFactorSource: selection.source,
        appliedFactorYear: null,
        manual: { value, source: selection.source, rateUnitId },
      };
    }

    case FactorSelectionType.DIRECT:
      return null;
  }
}

/** The declared total of a DIRECT line, in kg, or null for any other variant. */
function directTotalEmissionsInKg(item: ItemData): Prisma.Decimal | null {
  const selection = item.factorSelection;
  if (selection === null || selection.type !== FactorSelectionType.DIRECT) {
    return null;
  }
  return mapDecimalField(tonToKg(selection.totalEmissions));
}

/**
 * Creates a carbon inventory line input.
 *
 * The `manualFactor*` columns hold a custom factor and only a custom factor.
 * They used to be filled whenever the source text happened to be one of the
 * known custom labels, which meant a catalog factor named like a custom one
 * would land in the wrong columns; now the request says which variant it is.
 */
export async function createLineInput(
  tx: Prisma.TransactionClient,
  lineId: bigint,
  item: ItemData,
  inputType: InputType,
  resolvedFactor: ResolvedFactor | null,
  userId: bigint | null
) {
  const manual = resolvedFactor?.manual ?? null;

  return await tx.carbonInventoryLineInput.create({
    data: {
      lineId,
      inputType,
      selection1Id: mapBigIntField(item.dimensionValue1Id),
      selection2Id: mapBigIntField(item.dimensionValue2Id),
      quantity: item.quantity !== null ? mapDecimalField(item.quantity) : null,
      measurementUnitId: mapBigIntField(item.measurementUnitId),
      directTotalEmissions: directTotalEmissionsInKg(item),
      manualFactor: manual?.value ?? null,
      manualFactorSource: manual?.source ?? null,
      manualFactorRateUnitId: manual?.rateUnitId ?? null,
      comment: item.comment ?? null,
      isActive: true,
      createdById: userId,
      updatedAt: null,
    },
  });
}

/**
 * Snapshots the applied factor for a line.
 *
 * Every field comes from the already-resolved factor, which for a CATALOG
 * selection means it came from the catalog row and not from the request. A
 * DIRECT line resolves to null and gets no snapshot at all, so it can never
 * appear as a dated catalog factor.
 */
export async function createLineFactor(
  tx: Prisma.TransactionClient,
  lineInputId: bigint,
  resolvedFactor: ResolvedFactor | null,
  userId: bigint | null
) {
  if (resolvedFactor === null) return;

  await tx.carbonInventoryLineFactor.create({
    data: {
      lineInputId,
      emissionFactorId: resolvedFactor.emissionFactorId,
      appliedFactorValue: resolvedFactor.appliedFactorValue,
      appliedFactorRateUnitId: resolvedFactor.appliedFactorRateUnitId,
      appliedFactorSource: resolvedFactor.appliedFactorSource,
      appliedFactorYear: resolvedFactor.appliedFactorYear,
      createdById: userId,
      updatedAt: null,
    },
  });
}

/**
 * Computes and stores the line's total emissions from the server-resolved
 * factor, so the stored result always matches the stored snapshot.
 */
export async function createLineResult(
  tx: Prisma.TransactionClient,
  lineInputId: bigint,
  item: ItemData,
  inputType: InputType,
  resolvedFactor: ResolvedFactor | null,
  userId: bigint | null
) {
  let totalEmissions: Prisma.Decimal | null = null;

  const directTotal = directTotalEmissionsInKg(item);

  if (inputType === InputType.DIRECT && directTotal !== null) {
    totalEmissions = directTotal;
  } else if (
    (inputType === InputType.SIMPLIFIED || inputType === InputType.EXPERT) &&
    item.quantity !== null &&
    resolvedFactor !== null
  ) {
    totalEmissions = mapDecimalField(item.quantity).mul(
      resolvedFactor.appliedFactorValue
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
