import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  GetOrganizationBadgesParams,
  GetOrganizationBadgesQuery,
} from "@repo/types";
import { getOrganizationBadgesService } from "./service.js";

export const getOrganizationBadgesHandler = async (
  request: FastifyRequest<{
    Params: GetOrganizationBadgesParams;
    Querystring: GetOrganizationBadgesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;
  const { year, badgeTypes } = request.query;

  log.info(
    { organizationId: id, year, badgeTypes },
    "Getting organization badges..."
  );

  const prisma = request.server.prisma;
  const data = await getOrganizationBadgesService(prisma, id, year, badgeTypes);

  log.info(
    { organizationId: id },
    "Organization badges retrieved successfully"
  );
  return reply.status(200).send(data);
};
