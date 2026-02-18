import type { FastifyRequest, FastifyReply } from "fastify";
import type { FileType } from "@repo/types";
import { StorageNotConfiguredError } from "../errors.js";
import { uploadFileService } from "./service.js";

export const uploadFileHandler = async (
  request: FastifyRequest<{
    Params: { fileType: FileType; ownerId: string };
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { fileType, ownerId } = request.params;

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ fileType, ownerId }, "Uploading file...");

  const file = await request.file();
  if (!file) {
    return reply.status(400).send({
      code: "NO_FILE_PROVIDED",
      message: "No file was provided in the request",
    });
  }

  const buffer = await file.toBuffer();
  const prisma = request.server.prisma;

  if (!request.currentUser?.id) {
    return reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Authentication is required to upload files",
    });
  }

  const result = await uploadFileService(prisma, blobStorage, {
    fileType,
    ownerId,
    originalName: file.filename,
    mimeType: file.mimetype,
    buffer,
    userId: request.currentUser.id,
  });

  log.info({ uuid: result.uuid, fileType, ownerId }, "File uploaded successfully");
  return reply.status(201).send(result);
};
