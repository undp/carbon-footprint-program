import type { FastifyReply, FastifyRequest } from "fastify";
import type { BlockOrganizationParams } from "@repo/types";
import { blockOrganizationService } from "./service.js";

export const blockOrganizationHandler = async (
  request: FastifyRequest<{ Params: BlockOrganizationParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-organizations" });
  log.info({ organizationId: request.params.id }, "Blocking organization...");

  const prisma = request.server.prisma;
  const result = await blockOrganizationService(prisma, request.params.id);

  log.info(
    { organizationId: request.params.id },
    "Organization blocked successfully"
  );
  return reply.status(200).send(result);
};
