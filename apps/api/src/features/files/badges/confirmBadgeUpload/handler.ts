import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ConfirmBadgeUploadParams,
  ConfirmBadgeUploadBody,
} from "@repo/types";
import { badgeConfirmUploadService } from "./service.js";

export const badgeConfirmUploadHandler = async (
  request: FastifyRequest<{
    Params: ConfirmBadgeUploadParams;
    Body: ConfirmBadgeUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/badges" });
  const { badgeType } = request.params;
  const { uuid, originalName } = request.body;

  log.info({ uuid, badgeType }, "Confirming badge upload...");

  const result = await badgeConfirmUploadService(
    request.server.prisma,
    request.server.storage,
    {
      badgeType,
      uuid,
      originalName,
      userId: request.currentUser?.id.toString(),
    }
  );

  log.info({ uuid, badgeType }, "Badge upload confirmed");
  return reply.status(201).send(result);
};
