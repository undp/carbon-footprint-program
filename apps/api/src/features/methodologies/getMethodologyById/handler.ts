import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetMethodologyByIdParams } from "@repo/types";
import { getMethodologyByIdService } from "./service.js";

export const getMethodologyByIdHandler = async (
  request: FastifyRequest<{ Params: GetMethodologyByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodologies" });
  const { id: methodologyId } = request.params;

  log.info({ methodologyId }, "Getting methodology by ID...");

  const prisma = request.server.prisma;
  const result = await getMethodologyByIdService(prisma, methodologyId);

  log.info({ methodologyId }, "Methodology retrieved successfully");
  return reply.status(200).send(result);
};
