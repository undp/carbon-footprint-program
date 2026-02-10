import type { FastifyReply, FastifyRequest } from "fastify";
import { GetOrganizationsKpisService } from "./service.js";

export const GetOrganizationsKpisHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  log.info("Fetching admin organizations KPIs...");

  const prisma = request.server.prisma;
  const result = await GetOrganizationsKpisService(prisma);

  log.info(
    { total: result.total },
    "Admin organizations KPIs fetched successfully"
  );
  return reply.status(200).send(result);
};
