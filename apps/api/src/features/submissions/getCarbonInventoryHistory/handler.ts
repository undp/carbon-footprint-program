import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryHistoryParams } from "@repo/types";
import { getCarbonInventoryHistoryService } from "./service.js";
import { StorageNotConfiguredError } from "../../files/errors.js";

export const getCarbonInventoryHistoryHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching carbon inventory submission history...");

  const prisma = request.server.prisma;
  const blobServiceClient = request.server.blobServiceClient ?? null;
  const containerName = request.server.storageContainerName ?? null;

  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  const result = await getCarbonInventoryHistoryService(
    prisma,
    blobServiceClient,
    containerName,
    request.params.id
  );

  log.info("Carbon inventory submission history fetched");
  return reply.status(200).send(result);
};
