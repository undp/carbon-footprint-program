import { Prisma, type PrismaClient } from "@repo/database";
import {
  EmissionFactorStatus,
  EmissionFactorYearCopyViolationReason,
  MethodologyVersionStatus,
  User,
  type DuplicateEmissionFactorYearChange,
  type DuplicateEmissionFactorYearRequest,
  type DuplicateEmissionFactorYearResponse,
  type EmissionFactorYearCopyViolation,
} from "@repo/types";
import {
  planEmissionFactorYearCopy,
  YearCopyOutcome,
  type YearCopyFactor,
} from "@repo/utils";
import { attachDetails } from "@/errors/index.js";
import { visibleEmissionFactorWhere } from "@/helpers/visibleEmissionFactorWhere.js";
import { MethodologyNotFoundError } from "../../methodologies/errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { EmissionFactorYearCopyInvalidError } from "../errors.js";
import { gasDetailsMatchValue } from "../helpers.js";
import { parseGasDetails } from "../mappers.js";
import { toYearCopyWriteError } from "./helpers.js";

const yearCopyFactorSelect = {
  id: true,
  subcategoryId: true,
  dimensionValue1Id: true,
  dimensionValue2Id: true,
  rateMeasurementUnitId: true,
  source: true,
  value: true,
  gasDetails: true,
} satisfies Prisma.EmissionFactorSelect;

type StoredYearCopyFactor = Prisma.EmissionFactorGetPayload<{
  select: typeof yearCopyFactorSelect;
}>;

function toPlannerFactor(
  factor: StoredYearCopyFactor,
  gasDetails: unknown
): YearCopyFactor {
  return {
    id: factor.id.toString(),
    subcategoryId: factor.subcategoryId.toString(),
    dimensionValue1Id: factor.dimensionValue1Id?.toString() ?? null,
    dimensionValue2Id: factor.dimensionValue2Id?.toString() ?? null,
    rateMeasurementUnitId: factor.rateMeasurementUnitId.toString(),
    source: factor.source,
    value: factor.value.toString(),
    gasDetails,
  };
}

/**
 * Copies the factors of one year of a methodology version into another year of
 * the same version, applying the per-factor changes of the request.
 *
 * One transaction: the version must exist and not be DELETED (a PUBLISHED one
 * is accepted, as the single-row writes accept it); both years are read with
 * the maintainer's visibility filter; the shared planner decides each factor's
 * outcome and the rule violations, and this adds the gas breakdown check,
 * whose tolerance lives here. Any violation refuses the whole copy with one
 * 422 listing all of them; otherwise every copied factor is created at once.
 * Existing factors are never changed: the copy only inserts.
 */
export const duplicateEmissionFactorYearService = async (
  prismaClient: PrismaClient,
  data: DuplicateEmissionFactorYearRequest,
  user: User | null
): Promise<DuplicateEmissionFactorYearResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  try {
    return await prismaClient.$transaction(async (tx) => {
      const version = await tx.methodologyVersion.findFirst({
        where: {
          id: BigInt(data.methodologyVersionId),
          status: { not: MethodologyVersionStatus.DELETED },
        },
        select: { id: true },
      });
      if (!version) {
        throw new MethodologyNotFoundError();
      }

      const findYear = (year: number) =>
        tx.emissionFactor.findMany({
          where: {
            year,
            subcategory: { category: { methodologyVersionId: version.id } },
            ...visibleEmissionFactorWhere,
          },
          select: yearCopyFactorSelect,
          orderBy: { id: "asc" },
        });
      const storedSource = await findYear(data.sourceYear);
      const storedTarget = await findYear(data.targetYear);

      const storedSourceById = new Map(
        storedSource.map((factor) => [factor.id.toString(), factor])
      );
      const plan = planEmissionFactorYearCopy({
        sourceFactors: storedSource.map((factor) =>
          toPlannerFactor(factor, parseGasDetails(factor.gasDetails, factor.id))
        ),
        // The target's gas breakdowns play no part in the plan.
        targetFactors: storedTarget.map((factor) =>
          toPlannerFactor(factor, null)
        ),
        changes: data.changes,
      });

      const copied = plan.rows.filter(
        (row) => row.outcome === YearCopyOutcome.COPY
      );
      const violations: EmissionFactorYearCopyViolation[] = [
        ...plan.violations,
      ];
      for (const row of copied) {
        // Both sides are gas breakdowns: the source factor's, parsed above, or
        // the change's, validated by the request schema.
        const gasDetails = row.result.gasDetails as Record<string, number>;
        if (
          row.result.value !== null &&
          !gasDetailsMatchValue(gasDetails, row.result.value)
        ) {
          violations.push({
            sourceFactorId: row.sourceFactorId,
            reason: EmissionFactorYearCopyViolationReason.GAS_DETAILS_MISMATCH,
          });
        }
      }
      if (violations.length > 0) {
        throw attachDetails(new EmissionFactorYearCopyInvalidError(), {
          violations,
        });
      }

      // No duplicate changes past this point: the planner reported them.
      const changeById = new Map<string, DuplicateEmissionFactorYearChange>(
        data.changes.map((change) => [change.sourceFactorId, change])
      );
      const userId = BigInt(user.id);
      if (copied.length > 0) {
        await tx.emissionFactor.createMany({
          // Every column by hand, as `cloneEmissionFactors` writes them: a
          // column left out here is dropped from the copy without error.
          data: copied.map(({ sourceFactorId, result }) => {
            const stored = storedSourceById.get(sourceFactorId)!;
            const change = changeById.get(sourceFactorId);
            return {
              subcategoryId: stored.subcategoryId,
              dimensionValue1Id: stored.dimensionValue1Id,
              dimensionValue2Id: stored.dimensionValue2Id,
              rateMeasurementUnitId: stored.rateMeasurementUnitId,
              source: result.source,
              // The stored decimal when unchanged, so no digit goes through a
              // JavaScript number.
              value:
                result.valueChanged && result.value !== null
                  ? new Prisma.Decimal(result.value)
                  : stored.value,
              gasDetails:
                change?.gasDetails ?? stored.gasDetails ?? Prisma.JsonNull,
              year: data.targetYear,
              status: EmissionFactorStatus.ACTIVE,
              createdById: userId,
              // The column is `@updatedAt`: left out, every copy would read as
              // edited at creation.
              updatedAt: null,
            };
          }),
        });
      }

      return {
        copiedCount: plan.summary.copiedCount,
        editedCount: plan.summary.editedCount,
        excludedCount: plan.summary.excludedCount,
        skipped: { existingCount: plan.summary.existingCount },
      };
    });
  } catch (error) {
    throw toYearCopyWriteError(error);
  }
};
