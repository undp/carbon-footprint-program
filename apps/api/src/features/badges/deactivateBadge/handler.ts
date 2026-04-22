import type { FastifyRequest, FastifyReply } from "fastify";
import type { DeactivateBadgeParams } from "@repo/types";
import { StorageNotConfiguredError } from "../../files/errors.js";
import { deactivateBadgeService } from "./service.js";

export const deactivateBadgeHandler = async (
  request: FastifyRequest<{ Params: DeactivateBadgeParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges/deactivateBadge" });
  const { id } = request.params;

  const { blobServiceClient, storageContainerName } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ id }, "Deactivating badge...");

  const data = await deactivateBadgeService(
    request.server.prisma,
    blobServiceClient,
    storageContainerName,
    id
  );

  log.info({ id }, "Badge deactivated successfully");
  return reply.status(200).send(data);
};
