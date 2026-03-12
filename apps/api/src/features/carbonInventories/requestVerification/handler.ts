import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestVerificationParams,
  RequestVerificationBody,
} from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { requestVerificationService } from "./service.js";

export const requestVerificationHandler = async (
  request: FastifyRequest<{
    Params: RequestVerificationParams;
    Body: RequestVerificationBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const { id } = request.params;
  const { fileUuids } = request.body ?? {};

  log.info(`Performing action on CarbonInventory ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { blobServiceClient, storageContainerName } = request.server;

  if (fileUuids?.length && (!blobServiceClient || !storageContainerName)) {
    throw new StorageNotConfiguredError();
  }

  await requestVerificationService(
    prisma,
    id,
    user,
    fileUuids,
    blobServiceClient ?? undefined,
    storageContainerName ?? undefined
  );

  log.info(`CarbonInventory ${id} action completed successfully`);

  return reply.status(200).send(null);
};
