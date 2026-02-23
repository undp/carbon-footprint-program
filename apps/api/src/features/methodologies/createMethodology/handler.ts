import type { FastifyReply, FastifyRequest } from "fastify";
import { createMethodologyService } from "./service.js";
import type { CreateMethodologyRequest } from "@repo/types";

export const createMethodologyHandler = async (
  request: FastifyRequest<{ Body: CreateMethodologyRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodologies" });
  log.info("Creating methodology...");

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  const methodology = await createMethodologyService(
    prisma,
    request.body,
    user
  );

  log.info(
    { methodologyId: methodology.id },
    "Methodology created successfully"
  );
  return reply.status(201).send(methodology);
};
