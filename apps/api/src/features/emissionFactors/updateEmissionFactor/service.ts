import { type PrismaClient, Prisma } from "@repo/database";
import {
  EmissionFactorStatus,
  User,
  type UpdateEmissionFactorRequest,
  type UpdateEmissionFactorResponse,
} from "@repo/types";
import {
  EmissionFactorNotFoundError,
  EmissionFactorDuplicateError,
  EmissionFactorInUseError,
  RateMeasurementUnitNotFoundError,
} from "../errors.js";
import { parseGasDetails } from "../mappers.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  findDimensionValue,
  checkDuplicateEmissionFactor,
  countActiveLineReferences,
  detachFactorFromUnclaimedLines,
  validateSourceConsistency,
  validateGasDetailsSum,
  validateSubcategoryChangeDimensions,
} from "../helpers.js";

export const updateEmissionFactorService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateEmissionFactorRequest,
  user: User | null
): Promise<UpdateEmissionFactorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const emissionFactorId = BigInt(id);

  try {
    const result = await prismaClient.$transaction(async (tx) => {
      const existing = await tx.emissionFactor.findFirst({
        where: {
          id: emissionFactorId,
          status: EmissionFactorStatus.ACTIVE,
        },
        select: {
          id: true,
          subcategoryId: true,
          source: true,
          year: true,
          dimensionValue1Id: true,
          dimensionValue2Id: true,
          rateMeasurementUnitId: true,
          gasDetails: true,
          value: true,
        },
      });

      if (!existing) {
        throw new EmissionFactorNotFoundError(id);
      }

      // Before any validation and any write: a factor a footprint depends on is
      // immutable, whatever the field. The gas breakdown is not an exception —
      // the maintainer's breakdown modal reaches this same service with only
      // `gasDetails` in the payload.
      //
      // TODO: the check and the write are not atomic. `syncCarbonInventoryLines`
      // can attach a line between them, both at READ COMMITTED, so an edit can
      // land on a factor that became referenced a moment ago — which is what
      // happens today on every path, unguarded. Closing it means a
      // `SELECT … FOR UPDATE` on the factor row taken by both paths: one
      // statement, and it costs the same later.
      const referencedLineCount = await countActiveLineReferences(
        tx,
        emissionFactorId
      );
      if (referencedLineCount > 0) {
        throw new EmissionFactorInUseError(referencedLineCount.toString());
      }

      const effectiveYear = data.year ?? existing.year;

      if (
        data.source !== undefined ||
        data.subcategoryId !== undefined ||
        data.year !== undefined
      ) {
        const targetSubcategoryId =
          data.subcategoryId !== undefined
            ? BigInt(data.subcategoryId)
            : existing.subcategoryId;
        await validateSourceConsistency(
          tx,
          targetSubcategoryId,
          data.source ?? existing.source,
          effectiveYear,
          emissionFactorId
        );
      }

      if (data.gasDetails !== undefined || data.value !== undefined) {
        const gd = data.gasDetails ?? parseGasDetails(existing.gasDetails, id);
        validateGasDetailsSum(gd, data.value ?? existing.value.toNumber());
      }

      validateSubcategoryChangeDimensions(
        data.subcategoryId,
        existing.subcategoryId,
        data.dimensionValue1Name,
        data.dimensionValue2Name
      );

      const updateData: Prisma.EmissionFactorUncheckedUpdateInput = {
        updatedById: BigInt(user.id),
      };

      if (data.subcategoryId !== undefined)
        updateData.subcategoryId = BigInt(data.subcategoryId);
      if (data.rateMeasurementUnitId !== undefined)
        updateData.rateMeasurementUnitId = BigInt(data.rateMeasurementUnitId);
      if (data.source !== undefined) updateData.source = data.source;
      if (data.year !== undefined) updateData.year = data.year;
      if (data.gasDetails !== undefined)
        updateData.gasDetails = data.gasDetails;
      if (data.value !== undefined)
        updateData.value = new Prisma.Decimal(data.value);

      // Handle dimension value names (lookup only)
      if (data.dimensionValue1Name !== undefined) {
        if (data.dimensionValue1Name === null) {
          updateData.dimensionValue1Id = null;
        } else {
          const subcategoryId =
            data.subcategoryId !== undefined
              ? BigInt(data.subcategoryId)
              : existing.subcategoryId;
          updateData.dimensionValue1Id = await findDimensionValue(
            tx,
            subcategoryId,
            1,
            data.dimensionValue1Name
          );
        }
      }

      if (data.dimensionValue2Name !== undefined) {
        if (data.dimensionValue2Name === null) {
          updateData.dimensionValue2Id = null;
        } else {
          const subcategoryId =
            data.subcategoryId !== undefined
              ? BigInt(data.subcategoryId)
              : existing.subcategoryId;
          updateData.dimensionValue2Id = await findDimensionValue(
            tx,
            subcategoryId,
            2,
            data.dimensionValue2Name
          );
        }
      }

      // Check uniqueness when any of the uniqueness-key fields change
      const subcategoryChanged = data.subcategoryId !== undefined;
      const dim1Changed = data.dimensionValue1Name !== undefined;
      const dim2Changed = data.dimensionValue2Name !== undefined;
      const yearChanged = data.year !== undefined;

      const effectiveSubcategoryId =
        updateData.subcategoryId != null
          ? BigInt(updateData.subcategoryId as bigint)
          : existing.subcategoryId;
      const effectiveDim1Id = dim1Changed
        ? ((updateData.dimensionValue1Id as bigint | null) ?? null)
        : existing.dimensionValue1Id;
      const effectiveDim2Id = dim2Changed
        ? ((updateData.dimensionValue2Id as bigint | null) ?? null)
        : existing.dimensionValue2Id;
      const effectiveRateMeasurementUnitId =
        updateData.rateMeasurementUnitId != null
          ? BigInt(updateData.rateMeasurementUnitId as bigint)
          : existing.rateMeasurementUnitId;

      if (subcategoryChanged || dim1Changed || dim2Changed || yearChanged) {
        await checkDuplicateEmissionFactor(
          tx,
          effectiveSubcategoryId,
          effectiveDim1Id,
          effectiveDim2Id,
          effectiveYear,
          emissionFactorId
        );
      }

      // The guard above only proves that no *claimed* footprint depends on the
      // factor -- unclaimed ones are excluded from it by design -- so their
      // lines can still be holding a snapshot at this point. When the edit
      // moves the factor out of the context those lines were offered it in,
      // the capture selector stops listing it: `getCarbonInventoryMethodology`
      // filters by the footprint's year, and the front matches the line's
      // subcategory, dimensions and rate unit. The line would then paint a
      // blank "Fuente factor" beside a populated "Factor", and its next save
      // would drop the snapshot and the result without saying so. Detaching
      // lands those lines where the delete path already lands them: quantity
      // and unit survive, and the line asks for a factor again.
      //
      // `value` is deliberately not in the list. A snapshot that keeps the old
      // value while the catalogue moves on is the whole point of freezing it.
      //
      // A dimension value that becomes null widens the factor's reach instead
      // of narrowing it -- the front reads a null dimension as "applies to
      // any" -- so it leaves its lines alone. The reverse, null to a value, is
      // counted as narrowing even though the lines already carrying that value
      // would have kept it: the detach works per factor, not per line, and
      // asking a few anonymous lines to re-pick the same factor is the cheap
      // side of that trade.
      const narrows = (next: bigint | null, current: bigint | null): boolean =>
        next !== null && next !== current;

      const leavesItsLinesBehind =
        effectiveSubcategoryId !== existing.subcategoryId ||
        effectiveYear !== existing.year ||
        effectiveRateMeasurementUnitId !== existing.rateMeasurementUnitId ||
        narrows(effectiveDim1Id, existing.dimensionValue1Id) ||
        narrows(effectiveDim2Id, existing.dimensionValue2Id);

      if (leavesItsLinesBehind) {
        await detachFactorFromUnclaimedLines(tx, emissionFactorId);
      }

      await tx.emissionFactor.update({
        where: { id: emissionFactorId },
        data: updateData,
      });

      const emissionFactor = await tx.emissionFactor.findUnique({
        where: { id: emissionFactorId },
        include: {
          subcategory: { select: { id: true, name: true } },
          dimensionValue1: { select: { id: true, value: true } },
          dimensionValue2: { select: { id: true, value: true } },
          rateMeasurementUnit: { select: { id: true, name: true } },
        },
      });

      if (!emissionFactor) {
        throw new EmissionFactorNotFoundError(id);
      }

      return {
        id: emissionFactor.id.toString(),
        value: emissionFactor.value.toString(),
        source: emissionFactor.source,
        year: emissionFactor.year,
        subcategoryId: emissionFactor.subcategory.id.toString(),
        subcategoryName: emissionFactor.subcategory.name,
        dimensionValue1Id:
          emissionFactor.dimensionValue1?.id.toString() ?? null,
        dimensionValue1Name: emissionFactor.dimensionValue1?.value ?? null,
        dimensionValue2Id:
          emissionFactor.dimensionValue2?.id.toString() ?? null,
        dimensionValue2Name: emissionFactor.dimensionValue2?.value ?? null,
        rateMeasurementUnitId: emissionFactor.rateMeasurementUnit.id.toString(),
        rateMeasurementUnitName: emissionFactor.rateMeasurementUnit.name,
        gasDetails: parseGasDetails(
          emissionFactor.gasDetails,
          emissionFactor.id
        ),
      };
    });

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new RateMeasurementUnitNotFoundError();
      }
      if (error.code === "P2002") {
        throw new EmissionFactorDuplicateError();
      }
    }
    throw error;
  }
};
