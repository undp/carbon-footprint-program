import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import {} from "@repo/types";
import { type DeleteFileResponse, FileStatus } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import { mapFileToResponse } from "../mappers.js";

export const deleteFileService = async (
  prisma: PrismaClient,
  uuid: string
): Promise<DeleteFileResponse> => {
  try {
    const updated = await prisma.file.update({
      where: { uuid, status: FileStatus.ACTIVE },
      data: { status: FileStatus.DELETED, deletedAt: new Date() },
    });

    return mapFileToResponse(updated);
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
