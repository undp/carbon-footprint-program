import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";

// Generic handler factory for creating a resource
export const createPostHandler = <TBody, TResponse>(
  moduleName: string,
  serviceFn: (prisma: PrismaClient, data: TBody) => Promise<TResponse>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{ Body: TBody }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    log.info(`Creating ${resourceName}...`);

    const prisma = request.server.prisma;
    const data = await serviceFn(prisma, request.body as TBody);

    log.info(`${resourceName} created successfully`);

    return reply.status(201).send(data);
  };
};
