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

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid, badgeType }, "Confirming badge upload...");

  const prisma = request.server.prisma;
  const { blobServiceClient, storageContainerName } = request.server;

  const result = await badgeConfirmUploadService(
    prisma,
    blobStorage,
    { badgeType, uuid, originalName },
    blobServiceClient ?? undefined,
    storageContainerName ?? undefined
  );

  log.info({ uuid, badgeType }, "Badge upload confirmed");
  return reply.status(201).send(result);
};
