import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateOrganizationParams,
  UpdateOrganizationBody,
} from "@repo/types";
import { updateOrganizationService } from "./service.js";

export const updateOrganizationHandler = async (
  request: FastifyRequest<{
    Params: UpdateOrganizationParams;
    Body: UpdateOrganizationBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;
  const userId = request.currentUser!.id;
  const { fileUuids, ...bodyData } = request.body;

  log.info({ organizationId: id }, "Updating organization...");

  const result = await updateOrganizationService(
    request.server.prisma,
    id,
    userId,
    bodyData,
    fileUuids,
    request.server.storage
  );

  log.info({ organizationId: id }, "Organization updated successfully");
  return reply.status(200).send(result);
};
