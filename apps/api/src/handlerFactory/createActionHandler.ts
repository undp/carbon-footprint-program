import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@repo/types";

interface WithId {
  id: string;
}

export const createActionHandler = <TParams extends WithId, TResponse>(
  moduleName: string,
  serviceFn: (
    prisma: PrismaClient,
    id: string,
    user: User | null
  ) => Promise<TResponse>,
  resourceName: string
) => {
  return async (
    request: FastifyRequest<{ Params: TParams }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    const params = request.params as TParams;
    const { id } = params;
    log.info(`Performing action on ${resourceName} ${id}...`);

    const prisma = request.server.prisma;
    const user = request.currentUser ?? null;

    const data = await serviceFn(prisma, id, user);

    log.info(`${resourceName} ${id} action completed successfully`);

    return reply.status(200).send(data);
  };
};
