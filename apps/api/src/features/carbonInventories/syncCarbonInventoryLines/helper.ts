import { InputType, type Prisma } from "@repo/database";
import { CUSTOM_FACTOR_SOURCES } from "@/utils/index.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { mapDecimalField } from "@/utils/decimal.js";
import { tonToKg } from "@/utils/number.js";

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
