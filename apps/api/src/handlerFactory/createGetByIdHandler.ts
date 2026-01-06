import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";

// Generic handler factory for getting a single resource by ID
export const createGetByIdHandler = <TResponse>(
  moduleName: string,
  serviceFn: (prisma: PrismaClient, id: string) => Promise<TResponse | null>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    const { id } = request.params;
    log.info(`Getting ${resourceName} with ID: ${id}...`);

    const prisma = request.server.prisma;
    const data = await serviceFn(prisma, id);

    if (!data) {
      log.warn(`${resourceName} with ID ${id} not found`);
      return reply.status(404).send({
        code: "RESOURCE_NOT_FOUND",
        message: `${resourceName} not found`,
      });
    }
    log.info(`${resourceName} found successfully`);

    return reply.status(200).send(data);
  };
};
