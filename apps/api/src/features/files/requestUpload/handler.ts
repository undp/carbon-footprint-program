import type { FastifyRequest, FastifyReply } from "fastify";
import type { FileType, RequestUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../errors.js";
import { requestUploadService } from "./service.js";

export const requestUploadHandler = async (
  request: FastifyRequest<{
    Params: { fileType: FileType; ownerId: string };
    Body: RequestUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { fileType, ownerId } = request.params;
  const { originalName, mimeType } = request.body;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  log.info({ fileType, ownerId }, "Generating upload URL...");

  const prisma = request.server.prisma;
  const result = await requestUploadService(prisma, blobServiceClient, {
    fileType,
    ownerId,
    originalName,
    mimeType,
  });

  log.info(
    { uuid: result.uuid, fileType, ownerId },
    "Upload URL generated"
  );

  return reply.status(200).send(result);
};
