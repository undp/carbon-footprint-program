import type { FastifyRequest, FastifyReply } from "fastify";
import type { RequestUploadBody } from "@repo/types";
import { requestUploadService } from "./service.js";

export const requestUploadHandler = async (
  request: FastifyRequest<{ Body: RequestUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/requestUpload" });
  const { originalName, fileType } = request.body;

  log.info({ fileType }, "Generating upload URL...");

  const result = await requestUploadService(request.server.storage, {
    originalName,
    fileType,
  });

  log.info({ uuid: result.uuid, fileType }, "Upload URL generated");
  return reply.status(200).send(result);
};
