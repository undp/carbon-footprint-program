import type { FastifyRequest, FastifyReply } from "fastify";
import type { ConfirmUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../errors.js";
import { confirmUploadService } from "./service.js";

export const confirmUploadHandler = async (
  request: FastifyRequest<{ Body: ConfirmUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/confirmUpload" });
  const { uuid, originalName, fileType } = request.body;

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid, fileType }, "Confirming file upload...");

  const prisma = request.server.prisma;
  const result = await confirmUploadService(
    prisma,
    blobStorage,
    {
      uuid,
      originalName,
      fileType,
      userId: request.currentUser?.id,
    },
    log
  );

  log.info({ uuid, fileType }, "File upload confirmed");
  return reply.status(201).send(result);
};
