import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationHistoryParams } from "@repo/types";
import { getOrganizationHistoryService } from "./service.js";

import { StorageNotConfiguredError } from "../../files/errors.js";

export const getOrganizationHistoryHandler = async (
  request: FastifyRequest<{ Params: GetOrganizationHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching organization submission history...");

  const prisma = request.server.prisma;
  const blobServiceClient = request.server.blobServiceClient ?? null;
  const containerName = request.server.storageContainerName ?? null;

  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  const result = await getOrganizationHistoryService(
    prisma,
    blobServiceClient,
    containerName,
    request.params.id
  );

  log.info("Organization submission history fetched");
  return reply.status(200).send(result);
};
