import type { FastifyReply, FastifyRequest } from "fastify";
import type { UnblockOrganizationParams } from "@repo/types";
import { unblockOrganizationService } from "./service.js";

export const unblockOrganizationHandler = async (
  request: FastifyRequest<{ Params: UnblockOrganizationParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-organizations" });
  log.info({ organizationId: request.params.id }, "Unblocking organization...");

  const prisma = request.server.prisma;
  const result = await unblockOrganizationService(prisma, request.params.id);

  log.info(
    { organizationId: request.params.id },
    "Organization unblocked successfully"
  );
  return reply.status(200).send(result);
};
