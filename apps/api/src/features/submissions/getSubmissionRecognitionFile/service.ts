import { PrismaClient, SubmissionFileType } from "@repo/database";
import { GetSubmissionRecognitionFileResponse } from "@repo/types";
import { BlobServiceClient } from "@azure/storage-blob";
import { generateReadSasUrl } from "@/services/index.js";
import { SubmissionNotFoundError } from "../../files/errors.js";

export const getSubmissionRecognitionFileService = async (
  prismaClient: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  submissionId: string
): Promise<GetSubmissionRecognitionFileResponse> => {
  const submissionFile = await prismaClient.submissionFile.findFirst({
    where: {
      submissionId: BigInt(submissionId),
      type: SubmissionFileType.RECOGNITION,
    },
    include: {
      file: {
        select: { blobPath: true, mimeType: true, originalName: true },
      },
    },
  });

  if (!submissionFile || !submissionFile.file.blobPath) {
    throw new SubmissionNotFoundError(submissionId);
  }

  const { url: previewUrl } = await generateReadSasUrl(
    blobServiceClient,
    containerName,
    submissionFile.file.blobPath,
    { contentType: submissionFile.file.mimeType ?? undefined }
  );

  return {
    previewUrl,
    originalName: submissionFile.file.originalName ?? "recognition-file",
    mimeType: submissionFile.file.mimeType ?? "application/octet-stream",
  };
};
