import type { FastifyRequest, FastifyReply } from "fastify";
import { StorageNotConfiguredError } from "../../files/errors.js";
import { listBadgesService } from "./service.js";

export const listBadgesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges/listBadges" });

  const { blobServiceClient, storageContainerName } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info("Listing badge catalog...");

  const data = await listBadgesService(
    request.server.prisma,
    blobServiceClient,
    storageContainerName
  );

  log.info("Badge catalog retrieved successfully");
  return reply.status(200).send(data);
};
