import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { DeleteLineFileResponse } from "@repo/types";
import { FileNotFoundError } from "@/features/files/errors.js";
import { CrossInventoryFileLinkingError } from "../errors.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";

interface DeleteLineFileInput {
  carbonInventoryId: string;
  uuid: string;
}

export const deleteLineFileService = async (
  prisma: PrismaClient,
  input: DeleteLineFileInput
): Promise<DeleteLineFileResponse> => {
  const { carbonInventoryId, uuid } = input;

  // The file must exist and have a blob path scoped to this inventory.
  // The blob-path prefix is set at upload time and is tamper-resistant,
  // so a user with access to inventory A cannot delete a file owned by
  // inventory B even if they know its uuid.
  const file = await prisma.file.findUnique({
    where: { uuid },
    select: { uuid: true, status: true, blobPath: true },
  });
  if (!file || file.status !== FileStatus.ACTIVE) {
    throw new FileNotFoundError(uuid);
  }

  const expectedPrefix =
    buildCarbonInventoryLineBlobPathPrefix(carbonInventoryId);
  if (!file.blobPath.startsWith(expectedPrefix)) {
    throw new CrossInventoryFileLinkingError(carbonInventoryId, uuid);
  }

  await prisma.file.update({
    where: { uuid },
    data: { status: FileStatus.DELETED, deletedAt: new Date() },
  });

  return { uuid };
};
