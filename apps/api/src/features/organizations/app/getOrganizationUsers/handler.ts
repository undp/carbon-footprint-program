import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  GetOrganizationUsersParams,
  GetOrganizationUsersResponse,
} from "@repo/types";
import { getOrganizationUsersService } from "./service.js";

export const getOrganizationUsersHandler = async (
  request: FastifyRequest<{
    Params: GetOrganizationUsersParams;
  }>,
  reply: FastifyReply
): Promise<GetOrganizationUsersResponse> => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId } = request.params;

  log.info({ organizationId }, "Getting organization users...");

  const prisma = request.server.prisma;

  const data = await getOrganizationUsersService(prisma, organizationId);

  log.info(
    { organizationId, userCount: data.users.length },
    "Organization users retrieved successfully"
  );

  return reply.status(200).send(data);
};
