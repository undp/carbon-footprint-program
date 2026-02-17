import type { FastifyRequest, FastifyReply } from "fastify";
import { deleteFileService } from "./service.js";

export const deleteFileHandler = async (
  request: FastifyRequest<{
    Params: { uuid: string };
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  log.info({ uuid }, "Deleting file...");

  const prisma = request.server.prisma;
  const result = await deleteFileService(prisma, uuid);

  log.info({ uuid }, "File deleted successfully");
  return reply.status(200).send(result);
};
