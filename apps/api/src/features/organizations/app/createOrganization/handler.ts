import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateOrganizationBody } from "@repo/types";
import { createOrganizationService } from "./service.js";

export const createOrganizationHandler = async (
  request: FastifyRequest<{ Body: CreateOrganizationBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const userId = request.currentUser!.id;

  log.info("Creating organization...");

  const prisma = request.server.prisma;
  const result = await createOrganizationService(prisma, userId, request.body);

  log.info({ organizationId: result.id }, "Organization created successfully");
  return reply.status(201).send(result);
};
