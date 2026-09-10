import {
  EmissionFactorDimensionStatus,
  EmissionFactorStatus,
  FactorSelectionType,
  FileStatus,
  type FactorSelection,
  type UpdateFactorSelection,
} from "@repo/types";
import { InputType, Prisma } from "@repo/database";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";
import { tonToKg } from "@/utils/number.js";
import { DataIntegrityError } from "@/errors/index.js";
import { MissingFilesError } from "@/features/files/errors.js";
import {
  isSameMagnitudeFamily,
  type RateUnitMagnitudeFamily,
} from "@/features/measurementUnits/helpers.js";
import { RateMeasurementUnitNotFoundError } from "@/features/emissionFactors/errors.js";
import {
  CatalogEmissionFactorDimensionMismatchError,
  CatalogEmissionFactorNotFoundError,
  CatalogEmissionFactorNotInMethodologyError,
  CatalogEmissionFactorUnitFamilyMismatchError,
  CrossInventoryFileLinkingError,
  FactorSelectionInputTypeMismatchError,
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
  factorSelection: UpdateFactorSelection | null;
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
  /**
   * Nullable to mirror the column. A catalog or custom selection always carries
   * a source; only a snapshot read back from a line saved before the source was
   * required can be null, and re-saving that line must not invent one.
   */
  appliedFactorSource: string | null;
  appliedFactorYear: number | null;
  /** Set only for CUSTOM, which stores its factor on the line input itself. */
  manual: {
    value: Prisma.Decimal;
    source: string | null;
    rateUnitId: bigint;
  } | null;
};

/** A rate unit's family plus the base factors a conversion into it needs. */
type RateUnitConversion = RateUnitMagnitudeFamily & {
  numeratorBaseFactor: number;
  denominatorBaseFactor: number;
};

/**
 * The part of factor resolution that is the same for every line of a request.
 *
 * A sync writes one subcategory at a time, so its lines share a subcategory's
 * required dimensions and keep reusing the same handful of rate units. Read per
 * line, that was a dimension query and two rate-unit queries each — a 40-line
 * save spending over a hundred round-trips inside the transaction, against
 * Prisma's five-second budget. Read once, it is a single query plus one per
 * distinct unit.
 *
 * The snapshots an `UNCHANGED` update carries forward are read here for the
 * same reason, and it is the case that needs it most: a save that touches one
 * cell still sends every line of the subcategory as an update, and each of
 * those declares its factor unchanged.
 */
export type FactorResolutionContext = {
  methodologyVersionId: bigint | null;
  /** Required dimension positions, keyed by subcategory id. */
  requiredDimensionPositions: Map<string, Set<number>>;
  /** Rate units already read in this request, keyed by id. */
  rateUnits: Map<string, RateUnitConversion>;
  /**
   * The active input of every line an `UNCHANGED` update names, keyed by line
   * id. At most one per line: a partial unique index enforces that.
   */
  storedInputs: Map<string, StoredInputRow>;
};

/** The columns a preserved factor is rebuilt from. */
const storedInputSelect = {
  lineId: true,
  manualFactor: true,
  manualFactorSource: true,
  manualFactorRateUnitId: true,
  factor: {
    select: {
      emissionFactorId: true,
      appliedFactorValue: true,
      appliedFactorRateUnitId: true,
      appliedFactorSource: true,
      appliedFactorYear: true,
    },
  },
} satisfies Prisma.CarbonInventoryLineInputSelect;

type StoredInputRow = Prisma.CarbonInventoryLineInputGetPayload<{
  select: typeof storedInputSelect;
}>;

/**
 * Loads the shared part of factor resolution for what a request needs. Called
 * inside the sync transaction, so what it reads is what the writes are
 * validated against.
 *
 * Takes what the request asks for rather than a bare subcategory list, so a new
 * kind of lookup is a field here instead of another argument at the call site.
 */
export async function loadFactorResolutionContext(
  tx: Prisma.TransactionClient,
  methodologyVersionId: bigint | null,
  request: {
    subcategoryIds: bigint[];
    /** Lines whose stored snapshot an `UNCHANGED` update will keep. */
    unchangedLineIds: bigint[];
  }
): Promise<FactorResolutionContext> {
  const subcategoryIds = [...new Set(request.subcategoryIds)];
  const unchangedLineIds = [...new Set(request.unchangedLineIds)];

  const [dimensions, storedInputs] = await Promise.all([
    subcategoryIds.length > 0
      ? tx.emissionFactorDimension.findMany({
          where: {
            subcategoryId: { in: subcategoryIds },
            isRequired: true,
            status: EmissionFactorDimensionStatus.ACTIVE,
          },
          select: { subcategoryId: true, position: true },
        })
      : Promise.resolve([]),
    unchangedLineIds.length > 0
      ? tx.carbonInventoryLineInput.findMany({
          where: { lineId: { in: unchangedLineIds }, isActive: true },
          select: storedInputSelect,
        })
      : Promise.resolve([]),
  ]);

  const requiredDimensionPositions = new Map<string, Set<number>>();
  for (const dimension of dimensions) {
    const key = dimension.subcategoryId.toString();
    const positions = requiredDimensionPositions.get(key) ?? new Set<number>();
    positions.add(dimension.position);
    requiredDimensionPositions.set(key, positions);
  }

  return {
    methodologyVersionId,
    requiredDimensionPositions,
    rateUnits: new Map(),
    storedInputs: new Map(
      storedInputs.map((input) => [input.lineId.toString(), input])
    ),
  };
}

/**
 * Reads a rate unit once per request.
 *
 * Both things the resolution needs from it — the magnitude family it has to
 * share with the factor, and the base factors the conversion multiplies by —
 * come from the same row, so they are read together.
 */
async function loadRateUnit(
  tx: Prisma.TransactionClient,
  context: FactorResolutionContext,
  rateUnitId: bigint
): Promise<RateUnitConversion> {
  const key = rateUnitId.toString();
  const cached = context.rateUnits.get(key);
  if (cached) return cached;

  const rateUnit = await tx.rateMeasurementUnit.findUnique({
    where: { id: rateUnitId },
    select: {
      numeratorMeasurementUnit: {
        select: { magnitudeId: true, baseFactor: true },
      },
      denominatorMeasurementUnit: {
        select: { magnitudeId: true, baseFactor: true },
      },
    },
  });

  if (!rateUnit) throw new RateMeasurementUnitNotFoundError();

  const conversion: RateUnitConversion = {
    numeratorMagnitudeId: rateUnit.numeratorMeasurementUnit.magnitudeId,
    denominatorMagnitudeId: rateUnit.denominatorMeasurementUnit.magnitudeId,
    numeratorBaseFactor: rateUnit.numeratorMeasurementUnit.baseFactor,
    denominatorBaseFactor: rateUnit.denominatorMeasurementUnit.baseFactor,
  };
  context.rateUnits.set(key, conversion);
  return conversion;
}

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
  context: FactorResolutionContext,
  line: {
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
    factor.subcategoryId !== line.subcategoryId ||
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
  const requiredPositions =
    context.requiredDimensionPositions.get(line.subcategoryId.toString()) ??
    new Set<number>();

  if (
    (requiredPositions.has(1) &&
      factor.dimensionValue1Id !== line.dimensionValue1Id) ||
    (requiredPositions.has(2) &&
      factor.dimensionValue2Id !== line.dimensionValue2Id)
  ) {
    throw new CatalogEmissionFactorDimensionMismatchError(
      selection.emissionFactorId
    );
  }

  const appliedRateUnitId = BigInt(selection.appliedRateMeasurementUnitId);
  const appliedRateUnit = await loadRateUnit(tx, context, appliedRateUnitId);

  if (!isSameMagnitudeFamily(appliedRateUnit, factor)) {
    throw new CatalogEmissionFactorUnitFamilyMismatchError(
      selection.emissionFactorId
    );
  }

  const appliedValue =
    appliedRateUnitId === factor.rateMeasurementUnitId
      ? factor.value
      : convertToRateUnit(factor, appliedRateUnit);

  assertStorableAppliedFactorValue(appliedValue, selection.emissionFactorId);

  return {
    emissionFactorId: factor.id,
    appliedFactorValue: appliedValue,
    appliedFactorRateUnitId: appliedRateUnitId,
    appliedFactorSource: factor.source,
    appliedFactorYear: factor.year,
    manual: null,
  };
}

/**
 * `applied_factor_value` is `Decimal(28, 10)`, so 18 integer digits is all the
 * column can take. A conversion between distant units can exceed that, and the
 * write is inside the sync transaction: caught here it is a typed data error
 * naming the factor, left to Postgres it is a numeric overflow that rolls the
 * whole save back with nothing to act on.
 */
const MAX_APPLIED_FACTOR_VALUE = new Prisma.Decimal(10).pow(18);

function assertStorableAppliedFactorValue(
  appliedValue: Prisma.Decimal,
  emissionFactorId: string
): void {
  if (appliedValue.abs().gte(MAX_APPLIED_FACTOR_VALUE)) {
    throw new DataIntegrityError(
      `Applied factor value ${appliedValue.toString()} for emission factor ${emissionFactorId} does not fit applied_factor_value (Decimal(28, 10))`
    );
  }
}

function convertToRateUnit(
  factor: {
    value: Prisma.Decimal;
    rateMeasurementUnit: {
      numeratorMeasurementUnit: { baseFactor: number };
      denominatorMeasurementUnit: { baseFactor: number };
    };
  },
  target: RateUnitConversion
): Prisma.Decimal {
  // Decimal all the way: this value is persisted as the applied snapshot and
  // multiplied into the stored result, so a rounding here is permanent.
  return convertEmissionFactorValueDecimal(
    factor.value,
    factor.rateMeasurementUnit.numeratorMeasurementUnit.baseFactor,
    factor.rateMeasurementUnit.denominatorMeasurementUnit.baseFactor,
    target.numeratorBaseFactor,
    target.denominatorBaseFactor
  );
}

/**
 * Rejects a line whose factor variant contradicts its input type.
 *
 * A DIRECT line declares its total and has no factor; SIMPLIFIED and EXPERT
 * compute one from a factor. The two arrive in separate fields, so a request can
 * state both — and the pair persists silently: a declared total that no result
 * row ever reads, or a factor snapshot with no result behind it. Either way the
 * line shows a number in the editor and contributes zero to every aggregate.
 *
 * A line with no selection at all is still being filled in and is left alone.
 */
export function assertFactorSelectionMatchesInputType(
  item: ItemData,
  inputType: InputType
): void {
  const selection = item.factorSelection;
  if (selection === null) return;

  const isDirectSelection = selection.type === FactorSelectionType.DIRECT;
  const isDirectInput = inputType === InputType.DIRECT;

  if (isDirectSelection !== isDirectInput) {
    throw new FactorSelectionInputTypeMismatchError(selection.type, inputType);
  }
}

/**
 * Reads back the factor snapshot a line already has, from the active input the
 * context loaded, so an `UNCHANGED` selection can keep it verbatim.
 *
 * Nothing here touches the catalog. That is the whole point: the organization
 * did not change its factor, so neither an edit nor a retirement of the catalog
 * row may alter what this line stores or stop it from saving.
 *
 * Returns `null` when the line has no snapshot yet, which makes `UNCHANGED`
 * degrade to "no factor" rather than to an error.
 */
function resolveStoredFactor(
  context: FactorResolutionContext,
  lineId: bigint
): ResolvedFactor | null {
  const input = context.storedInputs.get(lineId.toString());
  const stored = input?.factor;
  if (!input || !stored) return null;

  // A custom factor lives on the line input as well as in the snapshot, so it
  // has to be carried across to the new input or the next read would see a
  // catalog-shaped line with no catalog row behind it.
  const manual =
    input.manualFactor !== null
      ? {
          value: input.manualFactor,
          source: input.manualFactorSource ?? stored.appliedFactorSource,
          // A line saved before the unit column was filled in has the factor
          // without its unit. The snapshot is the same value in the same unit,
          // so it answers for the column rather than dropping the factor.
          rateUnitId:
            input.manualFactorRateUnitId ?? stored.appliedFactorRateUnitId,
        }
      : null;

  return {
    emissionFactorId: stored.emissionFactorId,
    appliedFactorValue: stored.appliedFactorValue,
    appliedFactorRateUnitId: stored.appliedFactorRateUnitId,
    appliedFactorSource: stored.appliedFactorSource,
    appliedFactorYear: stored.appliedFactorYear,
    manual,
  };
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
  context: FactorResolutionContext,
  subcategoryId: bigint,
  /** Set for an update; absent on create, which has nothing stored yet. */
  lineId?: bigint
): Promise<ResolvedFactor | null> {
  const selection = item.factorSelection;
  if (selection === null) return null;

  switch (selection.type) {
    case FactorSelectionType.UNCHANGED:
      // Unreachable from a create: the create schema has no UNCHANGED variant.
      return lineId === undefined ? null : resolveStoredFactor(context, lineId);

    case FactorSelectionType.CATALOG:
      return await resolveCatalogFactor(tx, selection, context, {
        subcategoryId,
        dimensionValue1Id: mapBigIntField(item.dimensionValue1Id),
        dimensionValue2Id: mapBigIntField(item.dimensionValue2Id),
      });

    case FactorSelectionType.CUSTOM: {
      const rateUnitId = BigInt(selection.rateMeasurementUnitId);
      // Validates existence; a custom factor has no family to match against.
      await loadRateUnit(tx, context, rateUnitId);
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
