import type { FastifyRequest, FastifyReply } from "fastify";
import { deleteFileService } from "./service.js";
import { DeleteFileParams } from "@repo/types";

export const deleteFileHandler = async (
  request: FastifyRequest<{
    Params: DeleteFileParams;
  }>,
  reply: FastifyReply
) => {
  //TODO: Validate if user has access to the file before generating the URL

  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  log.info({ uuid }, "Deleting file...");

  const prisma = request.server.prisma;
  await deleteFileService(prisma, uuid);

  log.info({ uuid }, "File deleted successfully");
  return reply.status(200).send({ message: "File deleted successfully", uuid });
};
