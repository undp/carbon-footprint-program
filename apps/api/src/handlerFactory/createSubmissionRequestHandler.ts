import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@repo/types";
import type { StorageAdapter } from "@/services/storage/index.js";

interface WithId {
  id: string;
}

/**
 * Generic handler factory for submission-style actions (e.g. request
 * verification, request accreditation) that optionally accept pre-uploaded
 * file UUIDs and may require blob storage access.
 *
 * The supplied `serviceFn` is called with the resolved prisma client,
 * resource id, current user, fileUuids, and the storage adapter.
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
    storage?: StorageAdapter
  ) => Promise<TResponse>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{
      Params: TParams;
      Body: { fileUuids?: string[] } | null | undefined;
    }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    const { id } = request.params as TParams;
    const fileUuids = request.body?.fileUuids;

    log.info(`Performing action on ${resourceName} ${id}...`);

    const data = await serviceFn(
      request.server.prisma,
      id,
      request.currentUser ?? null,
      fileUuids,
      request.server.storage
    );

    log.info(`${resourceName} ${id} action completed successfully`);

    if (data === undefined) {
      return reply.status(200).send();
    }
    return reply.status(200).send(data);
  };
};
