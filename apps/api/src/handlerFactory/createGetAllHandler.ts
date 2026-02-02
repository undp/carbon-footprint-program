import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Creates a generic GET all handler
 * Type safety for query params is provided by the route schema (Zod validation)
 */
export const createGetAllHandler =
  <
    TResponse extends Array<unknown>,
    TQuery extends Record<string, unknown> = Record<string, never>,
  >(
    moduleName: string,
    serviceFn: (prisma: PrismaClient, query?: TQuery) => Promise<TResponse>,
    resourceName: string,
    treatEmptyAsNotFound: boolean = true
  ) =>
  async (
    request: FastifyRequest<{ Querystring?: TQuery }>,
    reply: FastifyReply
  ) => {
    const log = request.log.child({ module: moduleName });
    log.info(`Getting all ${resourceName}...`);

    const prisma = request.server.prisma;
    const query = request.query as TQuery | undefined;

    // Call service with query params (if any)
    const data = await serviceFn(prisma, query);

    if (treatEmptyAsNotFound && (!data || data.length === 0)) {
      log.warn(`${resourceName} not found`);
      reply.status(404).send({
        code: "RESOURCE_NOT_FOUND",
        message: `${resourceName} not found`,
      });
      return;
    }
    log.info(`${resourceName} found successfully`);

    reply.status(200).send(data);
  };
