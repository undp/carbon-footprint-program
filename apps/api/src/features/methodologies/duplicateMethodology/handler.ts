import type { FastifyReply, FastifyRequest } from "fastify";
import { duplicateMethodologyService } from "./service.js";
import type { DuplicateMethodologyParams } from "@repo/types";

export const duplicateMethodologyHandler = async (
  request: FastifyRequest<{ Params: DuplicateMethodologyParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodologies" });
  log.info({ methodologyId: request.params.id }, "Duplicating methodology...");

  const prisma = request.server.prisma;
  const methodology = await duplicateMethodologyService(
    prisma,
    request.params.id
  );

  log.info(
    { methodologyId: methodology.id },
    "Methodology duplicated successfully"
  );
  return reply.status(201).send(methodology);
};
