import type { FastifyReply, FastifyRequest } from "fastify";
import { getAdminOrganizationsService } from "./service.js";
import type { GetAdminOrganizationsQuery } from "@repo/types";

export const getAdminOrganizationsHandler = async (
  request: FastifyRequest<{ Querystring: GetAdminOrganizationsQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  log.info("Fetching admin organizations list...");

  const { statuses, limit, offset, sortBy, sortOrder } = request.query;
  const prisma = request.server.prisma;
  const result = await getAdminOrganizationsService(
    prisma,
    statuses,
    limit,
    offset,
    sortBy,
    sortOrder
  );

  log.info(
    { total: result.total, limit, offset },
    "Admin organizations fetched successfully"
  );
  return reply.status(200).send(result);
};
