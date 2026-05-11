import { type PrismaClient, Prisma, MagnitudeStatus } from "@repo/database";
import {
  type CreateMagnitudeBody,
  type CreateMagnitudeResponse,
  type User,
  MagnitudeCreationActionEnum,
} from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import { MagnitudeCodeAlreadyExistsError } from "../errors.js";
import { getMagnitudeReferenceCount } from "../helpers.js";
import { mapMagnitudeWithReferenceCount } from "../mappers.js";

export const createMagnitudeService = async (
  prismaClient: PrismaClient,
  body: CreateMagnitudeBody,
  _user: User | null
): Promise<CreateMagnitudeResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.magnitude.findUnique({
      where: { code: body.code },
    });

    if (!existing) {
      try {
        const created = await tx.magnitude.create({
          data: {
            code: body.code,
            name: body.name,
            isSystem: false,
            status: MagnitudeStatus.ACTIVE,
          },
        });
        return {
          ...mapMagnitudeWithReferenceCount(created, 0),
          action: MagnitudeCreationActionEnum.created,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new MagnitudeCodeAlreadyExistsError();
        }
        throw error;
      }
    }

    if (existing.status === MagnitudeStatus.ACTIVE) {
      throw new MagnitudeCodeAlreadyExistsError();
    }

    if (existing.isSystem) {
      throw new DataIntegrityError(
        `System magnitude id=${existing.id.toString()} code="${existing.code}" found in DELETED state — system magnitudes must never be soft-deleted.`
      );
    }

    const restored = await tx.magnitude.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        status: MagnitudeStatus.ACTIVE,
      },
    });

    const referenceCount = await getMagnitudeReferenceCount(tx, restored.id);

    return {
      ...mapMagnitudeWithReferenceCount(restored, referenceCount),
      action: MagnitudeCreationActionEnum.fullyRestored,
    };
  });
};
