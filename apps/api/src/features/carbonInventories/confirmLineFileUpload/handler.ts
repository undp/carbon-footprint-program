import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ConfirmLineFileUploadBody,
  ConfirmLineFileUploadParams,
} from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { confirmLineFileUploadService } from "./service.js";

export const confirmLineFileUploadHandler = async (
  request: FastifyRequest<{
    Params: ConfirmLineFileUploadParams;
    Body: ConfirmLineFileUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/confirmLineFileUpload",
  });
  const { id } = request.params;
  const { uuid, originalName } = request.body;

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid, carbonInventoryId: id }, "Confirming line file upload...");

  const prisma = request.server.prisma;
  const result = await confirmLineFileUploadService(prisma, blobStorage, {
    carbonInventoryId: id,
    uuid,
    originalName,
    userId: request.currentUser?.id,
  });

  log.info({ uuid, carbonInventoryId: id }, "Line file upload confirmed");
  return reply.status(201).send(result);
};
