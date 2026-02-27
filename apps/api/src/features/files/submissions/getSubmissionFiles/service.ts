import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type {
  GetSubmissionFilesQuery,
  GetSubmissionFilesResponse,
} from "@repo/types";
import { validateSubmissionExists } from "../helpers.js";
import { mapFileToResponse } from "../../mappers.js";

export const submissionGetFilesService = async (
  prisma: PrismaClient,
  submissionId: string,
  query?: GetSubmissionFilesQuery
): Promise<GetSubmissionFilesResponse> => {
  await validateSubmissionExists(prisma, submissionId);

  const submissionFiles = await prisma.submissionFile.findMany({
    where: {
      submissionId: BigInt(submissionId),
      ...(query?.submissionFileType && { type: query.submissionFileType }),
      file: {
        status: query?.status ?? FileStatus.ACTIVE,
      },
    },
    include: {
      file: true,
    },
    orderBy: { file: { createdAt: "desc" } },
  });

  return submissionFiles.map((sf) => mapFileToResponse(sf.file));
};
