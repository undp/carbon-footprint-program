import type { FastifyReply, FastifyRequest } from "fastify";
import { listBadgesService } from "./service.js";
import { StorageNotConfiguredError } from "../../files/errors.js";

export const listBadgesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });

  const { blobServiceClient, storageContainerName } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info("Listing badges...");
  const data = await listBadgesService(
    request.server.prisma,
    blobServiceClient,
    storageContainerName
  );

  log.info("Badges listed successfully");
  return reply.status(200).send(data);
};
