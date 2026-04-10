import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateReductionProjectRequest } from "@repo/types";
import { createReductionProjectService } from "./service.js";

export const createReductionProjectHandler = async (
  request: FastifyRequest<{ Body: CreateReductionProjectRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  log.info("Creating reduction project...");

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { blobServiceClient, storageContainerName } = request.server;

  const data = await createReductionProjectService(
    prisma,
    request.body,
    user,
    blobServiceClient ?? undefined,
    storageContainerName ?? undefined
  );

  log.info("Reduction project created successfully");
  return reply.status(201).send(data);
};
