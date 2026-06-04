import type { FastifyReply, FastifyRequest } from "fastify";
import { getBadgePreviewsService } from "./service.js";
import { GetBadgePreviewsQuery } from "@repo/types";

export const getBadgePreviewsHandler = async (
  request: FastifyRequest<{ Querystring: GetBadgePreviewsQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });

  log.info("Getting badge previews...");

  const { badgeTypes } = request.query;
  const data = await getBadgePreviewsService(
    request.server.prisma,
    request.server.storage,
    badgeTypes
  );

  log.info("Badge previews retrieved successfully");
  return reply.status(200).send(data);
};
