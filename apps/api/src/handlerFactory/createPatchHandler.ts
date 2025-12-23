import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";

interface WithId {
  id: string;
}

// Generic handler factory for patching/updating a resource
export const createPatchHandler = <TParams extends WithId, TBody, TResponse>(
  moduleName: string,
  serviceFn: (
    prisma: PrismaClient,
    id: string,
    data: TBody
  ) => Promise<TResponse | null>,
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
    const data = await serviceFn(prisma, id, body);

    if (!data) {
      log.warn(`${resourceName} with ID ${id} not found`);
      return reply.status(404).send({ message: `${resourceName} not found` });
    }

    log.info(`${resourceName} ${id} updated successfully`);

    return reply.status(200).send(data);
  };
};
