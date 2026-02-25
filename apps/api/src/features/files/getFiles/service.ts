import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { FileType, GetFilesQuery, GetFilesResponse } from "@repo/types";
import { validateFileTypeExists, findFileIdsByType } from "../helpers.js";
import { mapFileToResponse } from "../mappers.js";

export const getFilesService = async (
  prisma: PrismaClient,
  fileType: FileType,
  ownerId: string,
  query?: GetFilesQuery
): Promise<GetFilesResponse> => {
  const ownerIdBigInt = BigInt(ownerId);

  await validateFileTypeExists(prisma, fileType, ownerIdBigInt);

  const fileIds = await findFileIdsByType(
    prisma,
    fileType,
    ownerIdBigInt,
    query?.submissionFileType
  );
  if (fileIds.length === 0) return [];

  const files = await prisma.file.findMany({
    where: {
      id: { in: fileIds },
      status: query?.status ?? FileStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });

  return files.map(mapFileToResponse);
};
