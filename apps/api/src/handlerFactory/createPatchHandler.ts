import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@repo/types";

interface WithId {
  id: string;
}

// Generic handler factory for patching/updating a resource
// Note: Errors are handled by the global error handler in app.ts
// Services should throw errors using @fastify/error's createError for not found or other error cases
export const createPatchHandler = <TParams extends WithId, TBody, TResponse>(
  moduleName: string,
  serviceFn: (
    prisma: PrismaClient,
    id: string,
    data: TBody,
    user: User | null
  ) => Promise<TResponse>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{ Params: TParams; Body: TBody }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    // Safe to cast because TParams extends WithId, guaranteeing id exists
    const params = request.params as TParams;
    const body = request.body as TBody;
    const { id } = params;
    log.info(`Updating ${resourceName} ${id}...`);

    const prisma = request.server.prisma;
    const user = request.currentUser ?? null;

    const data = await serviceFn(prisma, id, body, user);

    log.info(`${resourceName} ${id} updated successfully`);

    return reply.status(200).send(data);
  };
};
