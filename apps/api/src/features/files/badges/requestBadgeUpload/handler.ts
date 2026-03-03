import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestBadgeUploadBody,
  RequestBadgeUploadParams,
} from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { badgeRequestUploadService } from "./service.js";

export const badgeRequestUploadHandler = async (
  request: FastifyRequest<{
    Params: RequestBadgeUploadParams;
    Body: RequestBadgeUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/badges" });
  const { badgeType } = request.params;
  const { originalName } = request.body;

  const { storageContainerName, blobServiceClient } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }
  log.info({ badgeType }, "Generating badge upload URL...");

  const prisma = request.server.prisma;
  const result = await badgeRequestUploadService(
    prisma,
    blobServiceClient,
    storageContainerName,
    {
      badgeType,
      originalName,
    }
  );

  log.info({ uuid: result.uuid, badgeType }, "Badge upload URL generated");
  return reply.status(200).send(result);
};
