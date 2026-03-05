import type { PrismaClient } from "@repo/database";
import { type DeleteFileResponse, FileStatus } from "@repo/types";
import { FileNotFoundError } from "../errors.js";

export const deleteFileService = async (
  prisma: PrismaClient,
  uuid: string
): Promise<DeleteFileResponse> => {
  const { count } = await prisma.file.updateMany({
    where: { uuid, status: FileStatus.ACTIVE },
    data: { status: FileStatus.DELETED, deletedAt: new Date() },
  });

  if (count === 0) throw new FileNotFoundError(uuid);

  return {
    message: "File deleted successfully",
    uuid,
  };
};
