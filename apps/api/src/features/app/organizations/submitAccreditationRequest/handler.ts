import type { FastifyReply, FastifyRequest } from "fastify";
import { submitAccreditationRequestService } from "./service.js";
import type { SubmitAccreditationRequestParams } from "@repo/types";

export const submitAccreditationRequestHandler = async (
  request: FastifyRequest<{ Params: SubmitAccreditationRequestParams }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const prisma = request.server.prisma;

  const result = await submitAccreditationRequestService(prisma, id);

  return reply.status(201).send(result);
};
