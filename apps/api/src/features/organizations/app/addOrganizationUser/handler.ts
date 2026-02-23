import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AddOrganizationUserParams,
  AddOrganizationUserBody,
  AddOrganizationUserResponse,
} from "@repo/types";
import { addOrganizationUserService } from "./service.js";

export const addOrganizationUserHandler = async (
  request: FastifyRequest<{
    Params: AddOrganizationUserParams;
    Body: AddOrganizationUserBody;
  }>,
  reply: FastifyReply
): Promise<AddOrganizationUserResponse> => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId } = request.params;
  const body = request.body;

  log.info({ organizationId }, "Adding user to organization...");

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  const data = await addOrganizationUserService(
    prisma,
    organizationId,
    body,
    user
  );

  log.info(
    { organizationId, userId: data.userId },
    "User added to organization successfully"
  );

  return reply.status(201).send(data);
};
