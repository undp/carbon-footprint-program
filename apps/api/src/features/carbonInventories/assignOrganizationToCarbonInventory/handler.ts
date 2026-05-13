import type { FastifyReply, FastifyRequest } from "fastify";
import type { AssignOrganizationToCarbonInventoryParams } from "@repo/types";
import { assignOrganizationToCarbonInventoryService } from "./service.js";

export const assignOrganizationToCarbonInventoryHandler = async (
  request: FastifyRequest<{
    Params: AssignOrganizationToCarbonInventoryParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const user = request.currentUser!;
  const { id, organizationId } = request.params;

  log.info(
    `Assigning organization ${organizationId} to carbon inventory ${id}...`
  );

  const prisma = request.server.prisma;
  await assignOrganizationToCarbonInventoryService(
    prisma,
    id,
    organizationId,
    user
  );

  log.info(
    `Organization ${organizationId} assigned to carbon inventory ${id} successfully`
  );
  return reply.status(200).send(null);
};
