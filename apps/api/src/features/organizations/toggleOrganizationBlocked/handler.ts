import type { FastifyReply, FastifyRequest } from "fastify";
import { toggleOrganizationBlockedService } from "./service.js";
import type { ToggleOrganizationBlockedParams } from "@repo/types";

export const toggleOrganizationBlockedHandler = async (
  request: FastifyRequest<{ Params: ToggleOrganizationBlockedParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organizations" });
  log.info(
    { organizationId: request.params.id },
    "Toggling organization blocked status..."
  );

  const prisma = request.server.prisma;
  const result = await toggleOrganizationBlockedService(
    prisma,
    request.params.id
  );

  log.info(
    {
      organizationId: result.id,
      status: result.status,
      previousStatus: result.previousStatus,
    },
    "Organization blocked status toggled successfully"
  );
  return reply.status(200).send(result);
};
