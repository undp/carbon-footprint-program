import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ConfirmBadgeUploadParams,
  ConfirmBadgeUploadBody,
} from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { badgeConfirmUploadService } from "./service.js";

export const badgeConfirmUploadHandler = async (
  request: FastifyRequest<{
    Params: ConfirmBadgeUploadParams;
    Body: ConfirmBadgeUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/badges" });
  const { badgeType } = request.params;
  const { uuid, originalName } = request.body;

  const { blobStorage, blobServiceClient, storageContainerName } =
    request.server;
  if (!blobStorage || !blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid, badgeType }, "Confirming badge upload...");

  const prisma = request.server.prisma;
  const result = await badgeConfirmUploadService(
    prisma,
    blobStorage,
    blobServiceClient,
    storageContainerName,
    {
      badgeType,
      uuid,
      originalName,
      userId: request.currentUser?.id.toString(),
    }
  );

  log.info({ uuid, badgeType }, "Badge upload confirmed");
  return reply.status(201).send(result);
};
