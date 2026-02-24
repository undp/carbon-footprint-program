import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ConfirmSubmissionUploadParams,
  ConfirmSubmissionUploadBody,
} from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { submissionConfirmUploadService } from "./service.js";

export const submissionConfirmUploadHandler = async (
  request: FastifyRequest<{
    Params: ConfirmSubmissionUploadParams;
    Body: ConfirmSubmissionUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/submissions" });
  const { submissionId } = request.params;
  const { uuid, originalName, submissionFileType } = request.body;

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  if (!request.currentUser?.id) {
    return reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Authentication is required to upload files",
    });
  }

  log.info({ uuid, submissionId }, "Confirming submission upload...");

  const prisma = request.server.prisma;
  const result = await submissionConfirmUploadService(prisma, blobStorage, {
    submissionId,
    uuid,
    originalName,
    submissionFileType,
    userId: request.currentUser.id,
  });

  log.info({ uuid, submissionId }, "Submission upload confirmed");
  return reply.status(201).send(result);
};
