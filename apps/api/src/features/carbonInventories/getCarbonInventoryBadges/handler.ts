import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventoryBadgesService } from "./service.js";
import { GetCarbonInventoryBadgesParams } from "@repo/types";
import { StorageNotConfiguredError } from "../../files/errors.js";

export const getCarbonInventoryBadgesHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryBadgesParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });

  const { id } = request.params;
  log.info({ carbonInventoryId: id }, "Getting Carbon inventory badges");

  const blobServiceClient = request.server.blobServiceClient;

  const { storageContainerName } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  const prisma = request.server.prisma;
  const data = await getCarbonInventoryBadgesService(
    prisma,
    blobServiceClient,
    storageContainerName,
    id
  );

  log.info("Carbon inventory badges found successfully");
  return reply.status(200).send(data);
};
