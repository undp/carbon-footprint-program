import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateReductionProjectParams,
  UpdateReductionProjectRequest,
} from "@repo/types";
import { updateReductionProjectService } from "./service.js";
import { StorageNotConfiguredError } from "@/features/files/errors.js";

export const updateReductionProjectHandler = async (
  request: FastifyRequest<{
    Params: UpdateReductionProjectParams;
    Body: UpdateReductionProjectRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const { id } = request.params;
  log.info(`Updating reduction project ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { blobServiceClient, storageContainerName } = request.server;

  if (blobServiceClient === undefined || storageContainerName === undefined) {
    throw new StorageNotConfiguredError();
  }

  const data = await updateReductionProjectService(
    prisma,
    id,
    request.body,
    user,
    blobServiceClient,
    storageContainerName
  );

  log.info(`Reduction project ${id} updated successfully`);
  return reply.status(200).send(data);
};
