import { FastifyReply, FastifyRequest } from "fastify";
import {
  UpdateOrganizationParams,
  UpdateOrganizationRequest,
} from "@repo/types";
import { updateOrganizationService } from "./service.js";

export const updateOrganizationHandler = async (
  request: FastifyRequest<{
    Params: UpdateOrganizationParams;
    Body: UpdateOrganizationRequest;
  }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const body = request.body;

  await updateOrganizationService(request.server.prisma, id, body);

  return reply.status(200).send({});
};
