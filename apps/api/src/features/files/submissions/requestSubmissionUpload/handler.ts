import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestSubmissionUploadParams,
  RequestSubmissionUploadBody,
} from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { submissionRequestUploadService } from "./service.js";

export const submissionRequestUploadHandler = async (
  request: FastifyRequest<{
    Params: RequestSubmissionUploadParams;
    Body: RequestSubmissionUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/submissions" });
  const { submissionId } = request.params;
  const { originalName, submissionFileType } = request.body;

  const { storageContainerName, blobServiceClient } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ submissionId }, "Generating submission upload URL...");

  const prisma = request.server.prisma;
  const result = await submissionRequestUploadService(
    prisma,
    blobServiceClient,

    storageContainerName,
    { submissionId, originalName, submissionFileType }
  );

  log.info(
    { uuid: result.uuid, submissionId },
    "Submission upload URL generated"
  );
  return reply.status(200).send(result);
};
