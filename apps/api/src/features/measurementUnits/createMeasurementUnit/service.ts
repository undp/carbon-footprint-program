import {
  type PrismaClient,
  Prisma,
  MeasurementUnitStatus,
} from "@repo/database";
import type {
  CreateMeasurementUnitBody,
  CreateMeasurementUnitResponse,
  User,
} from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  resolveKgMeasurementUnit,
  getReferenceCount,
  buildCanonicalRmuFields,
} from "../helpers.js";
import {
  MagnitudeAlreadyHasBaseUnitError,
  MeasurementUnitAbbreviationAlreadyExistsError,
} from "../errors.js";

const mapToResponse = (
  mu: {
    id: bigint;
    name: string;
    magnitude: string;
    abbreviation: string;
    baseFactor: number;
    isBase: boolean;
    status: MeasurementUnitStatus;
  },
  referenceCount: number,
  action: "created" | "restored-full" | "restored-labels"
): CreateMeasurementUnitResponse => ({
  id: mu.id.toString(),
  name: mu.name,
  magnitude: mu.magnitude as CreateMeasurementUnitResponse["magnitude"],
  abbreviation: mu.abbreviation,
  baseFactor: mu.baseFactor,
  isBase: mu.isBase,
  status: mu.status,
  referenceCount,
  action,
});

export const createMeasurementUnitService = async (
  prismaClient: PrismaClient,
  body: CreateMeasurementUnitBody,
  _user: User | null
): Promise<CreateMeasurementUnitResponse> => {
  try {
    return await prismaClient.$transaction(async (tx) => {
      const kg = await resolveKgMeasurementUnit(tx);

      if (body.isBase) {
        const existingBase = await tx.measurementUnit.findFirst({
          where: {
            magnitude: body.magnitude,
            isBase: true,
            status: MeasurementUnitStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (existingBase) throw new MagnitudeAlreadyHasBaseUnitError();
      }

      const existing = await tx.measurementUnit.findUnique({
        where: { abbreviation: body.abbreviation },
      });

      if (!existing) {
        const newMu = await tx.measurementUnit.create({
          data: {
            name: body.name,
            abbreviation: body.abbreviation,
            magnitude: body.magnitude,
            baseFactor: body.baseFactor,
            isBase: body.isBase,
            status: MeasurementUnitStatus.ACTIVE,
          },
        });

        await tx.rateMeasurementUnit.create({
          data: {
            ...buildCanonicalRmuFields(newMu),
            numeratorMeasurementUnitId: kg.id,
            denominatorMeasurementUnitId: newMu.id,
            status: MeasurementUnitStatus.ACTIVE,
          },
        });

        return mapToResponse(newMu, 0, "created");
      }

      if (existing.status === MeasurementUnitStatus.ACTIVE) {
        throw new MeasurementUnitAbbreviationAlreadyExistsError();
      }

      // Restore a soft-deleted unit
      const refCount = await getReferenceCount(tx, existing.id);
      const action = refCount > 0 ? "restored-labels" : "restored-full";

      const updateData =
        refCount > 0
          ? { name: body.name, abbreviation: body.abbreviation }
          : {
              name: body.name,
              abbreviation: body.abbreviation,
              magnitude: body.magnitude,
              baseFactor: body.baseFactor,
              isBase: body.isBase,
            };

      const updatedMu = await tx.measurementUnit.update({
        where: { id: existing.id },
        data: { ...updateData, status: MeasurementUnitStatus.ACTIVE },
      });

      // Restore the canonical RMU
      const canonicalRmu = await tx.rateMeasurementUnit.findFirst({
        where: {
          numeratorMeasurementUnitId: kg.id,
          denominatorMeasurementUnitId: existing.id,
        },
      });

      if (!canonicalRmu) {
        throw new DataIntegrityError(
          `No canonical RMU found for MeasurementUnit id=${existing.id} abbreviation="${existing.abbreviation}" during restore`
        );
      }

      await tx.rateMeasurementUnit.update({
        where: { id: canonicalRmu.id },
        data: {
          ...buildCanonicalRmuFields(updatedMu),
          status: MeasurementUnitStatus.ACTIVE,
        },
      });

      return mapToResponse(updatedMu, refCount, action);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new MeasurementUnitAbbreviationAlreadyExistsError();
      }
    }
    throw error;
  }
};
