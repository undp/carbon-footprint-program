import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestBadgeUploadBody,
  RequestBadgeUploadParams,
} from "@repo/types";
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

  log.info({ badgeType }, "Generating badge upload URL...");

  const result = await badgeRequestUploadService(request.server.storage, {
    badgeType,
    originalName,
  });

  log.info({ uuid: result.uuid, badgeType }, "Badge upload URL generated");
  return reply.status(200).send(result);
};
