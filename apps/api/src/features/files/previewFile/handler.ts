import type { FastifyRequest, FastifyReply } from "fastify";
import { previewFileService } from "./service.js";
import { PreviewFileParams } from "@repo/types";

export const previewFileHandler = async (
  request: FastifyRequest<{
    Params: PreviewFileParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  log.info({ uuid }, "Generating preview URL...");

  const result = await previewFileService(
    request.server.prisma,
    request.server.storage,
    uuid
  );

  log.info({ uuid }, "Preview URL generated");

  return reply.status(200).send(result);
};
