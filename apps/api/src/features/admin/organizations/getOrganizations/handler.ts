import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllOrganizationsService } from "./service.js";
import type { GetAllOrganizationsQuery } from "@repo/types";

export const getAllOrganizationsHandler = async (
  request: FastifyRequest<{ Querystring: GetAllOrganizationsQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  log.info("Fetching admin organizations list...");

  const { statuses, limit, offset, sortBy, sortOrder } = request.query;
  const prisma = request.server.prisma;
  const result = await getAllOrganizationsService(
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
