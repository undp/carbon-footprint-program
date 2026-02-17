import type { FastifyRequest, FastifyReply } from "fastify";
import type { FileType, GetFilesQuery } from "@repo/types";
import { getFilesService } from "./service.js";

export const getFilesHandler = async (
  request: FastifyRequest<{
    Params: { fileType: FileType; ownerId: string };
    Querystring: GetFilesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { fileType, ownerId } = request.params;
  const query = request.query;

  log.info({ fileType, ownerId }, "Listing files...");

  const prisma = request.server.prisma;
  const result = await getFilesService(prisma, fileType, ownerId, query);

  log.info({ fileType, ownerId, count: result.length }, "Files listed successfully");
  return reply.status(200).send(result);
};
