import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";

// Generic handler factory
export const createGetAllHandler = <TResponse extends Array<unknown>>(
  moduleName: string,
  serviceFn: (prisma: PrismaClient) => Promise<TResponse>,
  resourceName: string,
  treatEmptyAsNotFound: boolean = true
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const log = request.log.child({ module: moduleName });
    log.info(`Getting all ${resourceName}...`);

    const prisma = request.server.prisma;
    const data = await serviceFn(prisma);

    if (treatEmptyAsNotFound && (!data || data.length === 0)) {
      log.warn(`${resourceName} not found`);
      return reply.status(404).send({ message: `${resourceName} not found` });
    }
    log.info(`${resourceName} found successfully`);

    return reply.status(200).send(data);
  };
};
