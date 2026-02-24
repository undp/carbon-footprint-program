import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type {
  GetSubmissionFilesQuery,
  GetSubmissionFilesResponse,
} from "@repo/types";
import { validateSubmissionExists, findSubmissionFileIds } from "../helpers.js";
import { mapFileToResponse } from "../../mappers.js";

export const submissionGetFilesService = async (
  prisma: PrismaClient,
  submissionId: string,
  query?: GetSubmissionFilesQuery
): Promise<GetSubmissionFilesResponse> => {
  await validateSubmissionExists(prisma, submissionId);

  const fileIds = await findSubmissionFileIds(
    prisma,
    submissionId,
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
