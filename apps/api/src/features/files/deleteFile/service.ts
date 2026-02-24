import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import { type DeleteFileResponse, FileStatus } from "@repo/types";
import { FileNotFoundError } from "../errors.js";

export const deleteFileService = async (
  prisma: PrismaClient,
  uuid: string
): Promise<DeleteFileResponse> => {
  try {
    await prisma.file.updateMany({
      where: { uuid, status: FileStatus.ACTIVE },
      data: { status: FileStatus.DELETED, deletedAt: new Date() },
    });

    return {
      message: "File deleted successfully",
      uuid,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new FileNotFoundError(uuid);
    }
    throw error;
  }
};
