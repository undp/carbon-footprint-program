import type { FastifyRequest, FastifyReply } from "fastify";
import type { ConfirmLegalUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { confirmLegalUploadService } from "./service.js";

export const confirmLegalUploadHandler = async (
  request: FastifyRequest<{ Body: ConfirmLegalUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/legal" });
  const { uuid, originalName } = request.body;

  const { blobStorage } = request.server;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid }, "Confirming legal upload...");

  const prisma = request.server.prisma;
  const result = await confirmLegalUploadService(prisma, blobStorage, {
    uuid,
    originalName,
    userId: request.currentUser?.id.toString(),
  });

  log.info({ uuid }, "Legal upload confirmed");
  return reply.status(201).send(result);
};
