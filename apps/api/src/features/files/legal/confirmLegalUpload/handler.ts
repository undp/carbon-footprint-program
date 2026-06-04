import type { FastifyRequest, FastifyReply } from "fastify";
import type { ConfirmLegalUploadBody } from "@repo/types";
import { confirmLegalUploadService } from "./service.js";

export const confirmLegalUploadHandler = async (
  request: FastifyRequest<{ Body: ConfirmLegalUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/legal" });
  const { uuid, originalName } = request.body;

  log.info({ uuid }, "Confirming legal upload...");

  const result = await confirmLegalUploadService(
    request.server.prisma,
    request.server.storage,
    {
      uuid,
      originalName,
      userId: request.currentUser?.id.toString(),
    }
  );

  log.info({ uuid }, "Legal upload confirmed");
  return reply.status(201).send(result);
};
