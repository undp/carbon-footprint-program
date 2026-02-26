import type { FastifyRequest, FastifyReply } from "fastify";
import type { GetBadgeFilesQuery, GetBadgeFilesParams } from "@repo/types";
import { badgeGetFilesService } from "./service.js";

export const badgeGetFilesHandler = async (
  request: FastifyRequest<{
    Params: GetBadgeFilesParams;
    Querystring: GetBadgeFilesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/badges" });
  const { badgeType } = request.params;
  const query = request.query;

  log.info({ badgeType }, "Listing badge files...");

  const prisma = request.server.prisma;
  const result = await badgeGetFilesService(prisma, badgeType, query);

  log.info(
    { badgeType, count: result.length },
    "Badge files listed successfully"
  );
  return reply.status(200).send(result);
};
