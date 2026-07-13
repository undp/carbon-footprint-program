import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateReductionProjectRequest } from "@repo/types";
import { createReductionProjectService } from "./service.js";

export const createReductionProjectHandler = async (
  request: FastifyRequest<{ Body: CreateReductionProjectRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  log.info("Creating reduction project...");

  const data = await createReductionProjectService(
    request.server.prisma,
    request.body,
    request.currentUser ?? null
  );

  log.info("Reduction project created successfully");
  return reply.status(201).send(data);
};
