import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetReductionProjectHistoryParams } from "@repo/types";
import { getReductionProjectHistoryService } from "./service.js";
import { StorageNotConfiguredError } from "../../files/errors.js";

export const getReductionProjectHistoryHandler = async (
  request: FastifyRequest<{ Params: GetReductionProjectHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching reduction project submission history...");

  const prisma = request.server.prisma;
  const blobServiceClient = request.server.blobServiceClient ?? null;
  const containerName = request.server.storageContainerName ?? null;

  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  const result = await getReductionProjectHistoryService(
    prisma,
    blobServiceClient,
    containerName,
    request.params.id
  );

  log.info("Reduction project submission history fetched");
  return reply.status(200).send(result);
};
