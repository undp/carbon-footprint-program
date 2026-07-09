import type { FastifyRequest, FastifyReply } from "fastify";
import type { ConfirmUploadBody } from "@repo/types";
import { confirmUploadService } from "./service.js";

export const confirmUploadHandler = async (
  request: FastifyRequest<{ Body: ConfirmUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/confirmUpload" });
  const { uuid, originalName, fileType } = request.body;

  log.info({ uuid, fileType }, "Confirming file upload...");

  const result = await confirmUploadService(
    request.server.prisma,
    request.server.storage,
    {
      uuid,
      originalName,
      fileType,
      userId: request.currentUser?.id,
    }
  );

  log.info({ uuid, fileType }, "File upload confirmed");
  return reply.status(201).send(result);
};
