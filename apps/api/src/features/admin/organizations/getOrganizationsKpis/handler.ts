import type { FastifyReply, FastifyRequest } from "fastify";
import { getAdminOrganizationsKpisService } from "./service.js";

export const getAdminOrganizationsKpisHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  log.info("Fetching admin organizations KPIs...");

  const prisma = request.server.prisma;
  const result = await getAdminOrganizationsKpisService(prisma);

  log.info(
    { total: result.total },
    "Admin organizations KPIs fetched successfully"
  );
  return reply.status(200).send(result);
};
