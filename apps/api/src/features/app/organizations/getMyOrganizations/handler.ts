import type { FastifyReply, FastifyRequest } from "fastify";
import { getMyOrganizationsService } from "./service.js";

export const getMyOrganizationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app/organizations" });

  // TODO add user association
  // if (!request.authUser) {
  //   log.warn("No authenticated user found");
  //   throw new UserNotAuthenticatedError(request.authUser!.idpUserId);
  // }

  // log.info(
  //   { idpUserId: request.authUser.idpUserId },
  //   "Fetching user organizations"
  // );
  //
  const prisma = request.server.prisma;
  const result = await getMyOrganizationsService(
    prisma
    // request.authUser.idpUserId
  );

  log.info({ count: result.length }, "Retrieved user organizations");
  return reply.status(200).send(result);
};
