import type { FastifyReply, FastifyRequest } from "fastify";
import { getMyOrganizationsSelectorOptionsService } from "./service.js";

export const getMyOrganizationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  log.info("Getting user's organizations...");

  const prisma = request.server.prisma;
  const userId = request.currentUser!.id;

  const result = await getMyOrganizationsSelectorOptionsService(prisma, userId);

  log.info(
    { count: result.length },
    "User organizations retrieved successfully"
  );
  return reply.status(200).send(result);
};
