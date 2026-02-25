import type { FastifyRequest, FastifyReply } from "fastify";
import type { FileType, ConfirmUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../errors.js";
import { confirmUploadService } from "./service.js";

export const confirmUploadHandler = async (
  request: FastifyRequest<{
    Params: { fileType: FileType; ownerId: string };
    Body: ConfirmUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { fileType, ownerId } = request.params;
  const { uuid, originalName, mimeType, sizeBytes, submissionFileType } =
    request.body;

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

  log.info({ uuid, fileType, ownerId }, "Confirming upload...");

  const prisma = request.server.prisma;
  const result = await confirmUploadService(prisma, blobStorage, {
    fileType,
    ownerId,
    uuid,
    originalName,
    mimeType,
    sizeBytes,
    submissionFileType,
    userId: request.currentUser.id,
  });

  log.info({ uuid, fileType, ownerId }, "Upload confirmed");

  return reply.status(201).send(result);
};
