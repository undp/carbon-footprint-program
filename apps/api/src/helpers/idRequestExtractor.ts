import { FastifyRequest } from "fastify";

/**
 * Function type that extracts the ID from a request.
 * Can extract from params, body, query, or nested resources.
 *
 * @typeParam P - The params type for the request (e.g. `{ organizationId: string }`)
 */
export type IdExtractor<
  P extends Record<string, string> = Record<string, string>,
> = (request: FastifyRequest<{ Params: P }>) => string | null | undefined;

export const idRequestExtractor: IdExtractor = (request) => request.params.id;
