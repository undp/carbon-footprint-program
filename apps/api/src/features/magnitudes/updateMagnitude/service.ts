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
    const target = await tx.magnitude.findUnique({
      where: { id: BigInt(id) },
    });

    if (!target || target.status === MagnitudeStatus.DELETED) {
      throw new MagnitudeNotFoundError(id);
    }

    const updated = await tx.magnitude.update({
      where: { id: target.id },
      data: { name: body.name },
    });

    const referenceCount = await getMagnitudeReferenceCount(tx, updated.id);

    return mapMagnitudeWithReferenceCount(updated, referenceCount);
  });
};
