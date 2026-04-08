import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetSubmissionRecognitionFileParams } from "@repo/types";
import { getSubmissionRecognitionFileService } from "./service.js";
import { StorageNotConfiguredError } from "../../files/errors.js";

export const getSubmissionRecognitionFileHandler = async (
  request: FastifyRequest<{ Params: GetSubmissionRecognitionFileParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  const { id } = request.params;

  log.info({ submissionId: id }, "Getting submission recognition file...");

  const blobServiceClient = request.server.blobServiceClient;
  const { storageContainerName } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  const prisma = request.server.prisma;
  const data = await getSubmissionRecognitionFileService(
    prisma,
    blobServiceClient,
    storageContainerName,
    id
  );

  log.info(
    { submissionId: id },
    "Submission recognition file retrieved successfully"
  );
  return reply.status(200).send(data);
};
