import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetAllTerritoriesQuery } from "@repo/types";
import { getAllTerritoriesService } from "./service.js";

/**
 * Returns an empty array rather than a 404 when a node has no children: a leaf
 * of the hierarchy and a level the official catalog has not filled in yet are
 * both expected states, and the form hides the selector instead of erroring.
 */
export const getAllTerritoriesHandler = async (
  request: FastifyRequest<{ Querystring: GetAllTerritoriesQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "territories",
    filters: request.query,
  });
  log.info("Getting territories...");

  const data = await getAllTerritoriesService(
    request.server.prisma,
    request.query
  );

  log.info(`Territories found successfully (${data.length} items)`);

  return reply.status(200).send(data);
};
