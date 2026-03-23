import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetValidFootprintYearsParams } from "@repo/types";
import { getValidFootprintYearsService } from "./service.js";

export const getValidFootprintYearsHandler = async (
  request: FastifyRequest<{ Params: GetValidFootprintYearsParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { orgId } = request.params;

  log.info(`Getting valid footprint years for organization ${orgId}...`);
  const result = await getValidFootprintYearsService(prisma, orgId, user);

  return reply.status(200).send(result);
};
