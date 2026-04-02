import type { PrismaClient } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import { EmptyResourceError } from "../errors/EmptyResourceError.js";
import type { User } from "@repo/types";

/**
 * Creates a generic GET all handler
 * Type safety for query params is provided by the route schema (Zod validation)
 */
export const createGetAllHandler =
  <
    TResponse extends Array<unknown>,
    TQuery extends Record<string, unknown> | null = null,
  >(
    moduleName: string,
    serviceFn: (
      prisma: PrismaClient,
      query: TQuery | null,
      user: User | null
    ) => Promise<TResponse>,
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
    const user = request.currentUser ?? null;
    // TODO: refactor to parse query params correctly with zod
    const query = (request.query ?? null) as TQuery | null;

    // Call service with query params (if any)
    const data = await serviceFn(prisma, query, user);
    if (treatEmptyAsNotFound && (!data || data.length === 0)) {
      throw new EmptyResourceError(resourceName);
    }
    log.info(`${resourceName} found successfully`);

    return reply.status(200).send(data);
  };
