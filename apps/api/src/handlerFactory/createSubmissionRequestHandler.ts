import type { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";

interface WithId {
  id: string;
}

/**
 * Generic handler factory for submission-style actions (e.g. request
 * verification, request accreditation) that optionally accept pre-uploaded
 * file UUIDs and may require blob storage access.
 *
 * The supplied `serviceFn` is called with the resolved prisma client,
 * resource id, current user, fileUuids, and storage credentials.
 */
export const createSubmissionRequestHandler = <
  TParams extends WithId,
  TResponse,
>(
  moduleName: string,
  serviceFn: (
    prisma: PrismaClient,
    id: string,
    user: User | null,
    fileUuids?: string[],
    blobServiceClient?: BlobServiceClient,
    containerName?: string
  ) => Promise<TResponse>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{
      Params: TParams;
      Body: { fileUuids?: string[] } | null;
    }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    const { id } = request.params as TParams;
    const fileUuids = request.body?.fileUuids;

    log.info(`Performing action on ${resourceName} ${id}...`);

    const prisma = request.server.prisma;
    const user = request.currentUser ?? null;
    const { blobServiceClient, storageContainerName } = request.server;

    if (fileUuids?.length && (!blobServiceClient || !storageContainerName)) {
      throw new StorageNotConfiguredError();
    }

    const data = await serviceFn(
      prisma,
      id,
      user,
      fileUuids,
      blobServiceClient ?? undefined,
      storageContainerName ?? undefined
    );

    log.info(`${resourceName} ${id} action completed successfully`);

    return reply.status(200).send(data ?? null);
  };
};
