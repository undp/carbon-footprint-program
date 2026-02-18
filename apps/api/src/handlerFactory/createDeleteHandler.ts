import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@repo/types";

interface WithId {
  id: string;
}

// Generic handler factory for deleting a resource
// Note: Errors are handled by the global error handler in app.ts
// Services should throw errors using @fastify/error's createError for not found or other error cases
export const createDeleteHandler = <TParams extends WithId>(
  moduleName: string,
  serviceFn: (
    prisma: PrismaClient,
    id: string,
    user: User | null
  ) => Promise<void>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{ Params: TParams }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    const params = request.params as TParams;
    const { id } = params;
    log.info(`Deleting ${resourceName} ${id}...`);

    const prisma = request.server.prisma;
    const user = request.currentUser ?? null;

    const _ = await serviceFn(prisma, id, user);

    log.info(`${resourceName} ${id} deleted successfully`);

    return reply.status(200).send();
  };
};
