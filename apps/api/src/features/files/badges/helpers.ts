import {
  BadgeType,
  type PrismaClient,
  type Prisma,
  BadgeStatus,
} from "@repo/database";
import { FileTypeNotFoundError } from "../shared/errors.js";

export function validateBadgeType(type: BadgeType): void {
  if (!Object.values(BadgeType).includes(type)) {
    throw new FileTypeNotFoundError("BadgeType", type);
  }
}

export async function createBadgeEntry(
  tx: Prisma.TransactionClient,
  fileId: bigint,
  type: BadgeType
): Promise<void> {
  await tx.badge.updateMany({
    where: { type, status: BadgeStatus.ACTIVE },
    data: { status: BadgeStatus.INACTIVE },
  });
  await tx.badge.create({
    data: { type, fileId, status: BadgeStatus.ACTIVE },
  });
}

export async function findActiveBadgeByType(
  prisma: PrismaClient,
  type: BadgeType
): Promise<bigint[]> {
  const badge = await prisma.badge.findFirst({
    where: { type, status: BadgeStatus.ACTIVE },
    select: { fileId: true },
  });
  return badge ? [badge.fileId] : [];
}
