import type { FastifyReply, FastifyRequest } from "fastify";
import type { RequestOrganizationAccreditationParams } from "@repo/types";
import { requestOrganizationAccreditationService } from "./service.js";

export const requestOrganizationAccreditationHandler = async (
  request: FastifyRequest<{
    Params: RequestOrganizationAccreditationParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;
  const userId = request.currentUser!.id;

  log.info({ organizationId: id }, "Requesting organization accreditation...");

  const prisma = request.server.prisma;
  const result = await requestOrganizationAccreditationService(
    prisma,
    id,
    userId
  );

  log.info(
    { organizationId: id },
    "Organization accreditation requested successfully"
  );
  return reply.status(200).send(result);
};
