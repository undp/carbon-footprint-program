import type { FastifyRequest, FastifyReply } from "fastify";
import type { BadgeType } from "@repo/database";
import type { BadgeRequestUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { badgeRequestUploadService } from "./service.js";

export const badgeRequestUploadHandler = async (
  request: FastifyRequest<{
    Params: { badgeType: BadgeType };
    Body: BadgeRequestUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/badges" });
  const { badgeType } = request.params;
  const { originalName, mimeType } = request.body;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  log.info({ badgeType }, "Generating badge upload URL...");

  const prisma = request.server.prisma;
  const result = await badgeRequestUploadService(prisma, blobServiceClient, {
    badgeType,
    originalName,
    mimeType,
  });

  log.info({ uuid: result.uuid, badgeType }, "Badge upload URL generated");
  return reply.status(200).send(result);
};
