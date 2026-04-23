import { BlobServiceClient } from "@azure/storage-blob";
import { SubmissionType } from "@repo/types";

import { generateReadSasUrl } from "@/services/index.js";

type SubmissionForRecognition = {
  id: bigint;
  type: SubmissionType;
  updatedAt: Date | null;
  files: {
    file: { blobPath: string | null; mimeType: string | null } | null;
  }[];
};

type MapApprovedSubmissionsToRecognitionsParams = {
  submissions: SubmissionForRecognition[];
  measurementYear: number;
  totalEmissions: number | null;
  blobServiceClient: BlobServiceClient | null | undefined;
  containerName: string | null | undefined;
};

export const mapApprovedSubmissionsToRecognitions = async ({
  submissions,
  measurementYear,
  totalEmissions,
  blobServiceClient,
  containerName,
}: MapApprovedSubmissionsToRecognitionsParams) =>
  Promise.all(
    submissions.map(async (submission) => {
      const recognitionFile = submission.files[0]?.file;
      let recognitionFileUrl: string | null = null;

      if (recognitionFile?.blobPath && blobServiceClient && containerName) {
        const { url } = await generateReadSasUrl(
          blobServiceClient,
          containerName,
          recognitionFile.blobPath,
          { contentType: recognitionFile.mimeType ?? undefined }
        );
        recognitionFileUrl = url;
      }

      return {
        submissionId: submission.id.toString(),
        earningDate: submission.updatedAt?.toISOString() ?? null,
        measurementYear,
        submissionType: submission.type,
        totalEmissions,
        recognitionFileUrl,
      };
    })
  );
