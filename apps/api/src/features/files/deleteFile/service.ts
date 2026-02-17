import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { DeleteFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import { mapFileToResponse } from "../mappers.js";

export const deleteFileService = async (
  prisma: PrismaClient,
  uuid: string
): Promise<DeleteFileResponse> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const updated = await prisma.file.update({
    where: { uuid },
    data: { status: FileStatus.DELETED, deletedAt: new Date() },
  });

  return mapFileToResponse(updated);
};
