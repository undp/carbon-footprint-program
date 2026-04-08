import type { FastifyReply, FastifyRequest } from "fastify";
import { getBadgePreviewsService } from "./service.js";
import { StorageNotConfiguredError } from "../../files/errors.js";
import { GetBadgePreviewsQuery } from "@repo/types";

export const getBadgePreviewsHandler = async (
  request: FastifyRequest<{ Querystring: GetBadgePreviewsQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });

  log.info("Getting badge previews...");

  const blobServiceClient = request.server.blobServiceClient;
  const { storageContainerName } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  const prisma = request.server.prisma;
  const { badgeTypes } = request.query;
  const data = await getBadgePreviewsService(
    prisma,
    blobServiceClient,
    storageContainerName,
    badgeTypes
  );

  log.info("Badge previews retrieved successfully");
  return reply.status(200).send(data);
};
