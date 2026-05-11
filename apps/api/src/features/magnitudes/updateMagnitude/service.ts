import { type PrismaClient, MagnitudeStatus } from "@repo/database";
import type {
  UpdateMagnitudeBody,
  UpdateMagnitudeResponse,
  User,
} from "@repo/types";
import { MagnitudeNotFoundError } from "../errors.js";
import { getMagnitudeReferenceCount } from "../helpers.js";
import { mapMagnitudeWithReferenceCount } from "../mappers.js";

export const updateMagnitudeService = async (
  prismaClient: PrismaClient,
  id: string,
  body: UpdateMagnitudeBody,
  _user: User | null
): Promise<UpdateMagnitudeResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    const magnitudeId = BigInt(id);

    const { count } = await tx.magnitude.updateMany({
      where: {
        id: magnitudeId,
        status: { not: MagnitudeStatus.DELETED },
      },
      data: { name: body.name },
    });

    if (count === 0) {
      throw new MagnitudeNotFoundError(id);
    }

    const updated = await tx.magnitude.findUniqueOrThrow({
      where: { id: magnitudeId },
    });

    const referenceCount = await getMagnitudeReferenceCount(tx, updated.id);

    return mapMagnitudeWithReferenceCount(updated, referenceCount);
  });
};
