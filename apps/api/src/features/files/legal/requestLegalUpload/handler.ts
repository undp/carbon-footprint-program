import type { FastifyRequest, FastifyReply } from "fastify";
import type { RequestLegalUploadBody } from "@repo/types";
import { requestLegalUploadService } from "./service.js";

export const requestLegalUploadHandler = async (
  request: FastifyRequest<{ Body: RequestLegalUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/legal" });
  const { originalName } = request.body;

  log.info({ originalName }, "Generating legal upload URL...");

  const result = await requestLegalUploadService(request.server.storage, {
    originalName,
  });

  log.info({ uuid: result.uuid }, "Legal upload URL generated");
  return reply.status(200).send(result);
};
