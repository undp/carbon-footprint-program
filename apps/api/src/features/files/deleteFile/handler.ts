import type { FastifyRequest, FastifyReply } from "fastify";
import { deleteFileService } from "./service.js";
import { DeleteFileParams } from "@repo/types";

export const deleteFileHandler = async (
  request: FastifyRequest<{
    Params: DeleteFileParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  log.info({ uuid }, "Deleting file...");

  const prisma = request.server.prisma;
  await deleteFileService(prisma, uuid);

  log.info({ uuid }, "File deleted successfully");
  return reply.status(200).send();
};
