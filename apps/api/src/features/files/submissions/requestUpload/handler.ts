import type { FastifyRequest, FastifyReply } from "fastify";
import type { SubmissionRequestUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../../shared/errors.js";
import { submissionRequestUploadService } from "./service.js";

export const submissionRequestUploadHandler = async (
  request: FastifyRequest<{
    Params: { submissionId: string };
    Body: SubmissionRequestUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/submissions" });
  const { submissionId } = request.params;
  const { originalName, mimeType, submissionFileType } = request.body;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  log.info({ submissionId }, "Generating submission upload URL...");

  const prisma = request.server.prisma;
  const result = await submissionRequestUploadService(
    prisma,
    blobServiceClient,
    { submissionId, originalName, mimeType, submissionFileType }
  );

  log.info(
    { uuid: result.uuid, submissionId },
    "Submission upload URL generated"
  );
  return reply.status(200).send(result);
};
