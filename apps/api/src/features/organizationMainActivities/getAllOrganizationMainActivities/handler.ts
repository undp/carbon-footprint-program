import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllOrganizationMainActivitiesService } from "./service.js";
import type { GetAllOrganizationMainActivitiesQuery } from "@repo/types";

export const getAllOrganizationMainActivitiesHandler = async (
  request: FastifyRequest<{
    Querystring: GetAllOrganizationMainActivitiesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "organizationMainActivities",
    filters: request.query,
  });
  log.info("Getting all organization main activities...");

  const prisma = request.server.prisma;
  const data = await getAllOrganizationMainActivitiesService(
    prisma,
    request.query
  );

  if (!data || data.length === 0) {
    log.warn("Organization main activities not found");
    return reply
      .status(404)
      .send({ message: "Organization main activities not found" });
  }
  log.info(
    `Organization main activities found successfully (${data.length} items)`
  );

  return reply.status(200).send(data);
};
