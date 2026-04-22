import type { FastifyRequest, FastifyReply } from "fastify";
import type { ActivateBadgeParams } from "@repo/types";
import { StorageNotConfiguredError } from "../../files/errors.js";
import { activateBadgeService } from "./service.js";

export const activateBadgeHandler = async (
  request: FastifyRequest<{ Params: ActivateBadgeParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges/activateBadge" });
  const { id } = request.params;

  const { blobServiceClient, storageContainerName } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ id }, "Activating badge...");

  const data = await activateBadgeService(
    request.server.prisma,
    blobServiceClient,
    storageContainerName,
    id
  );

  log.info({ id }, "Badge activated successfully");
  return reply.status(200).send(data);
};
