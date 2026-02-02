import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetAllCarbonInventoriesQuery } from "@repo/types";
import { getAllCarbonInventoriesService } from "./getAllCarbonInventoriesService.js";

export const getAllCarbonInventoriesHandler = async (
  request: FastifyRequest<{
    Querystring: GetAllCarbonInventoriesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories",
  });

  const { year } = request.query;

  log.info({ year }, "Getting all carbon inventories...");

  const prisma = request.server.prisma;

  try {
    const data = await getAllCarbonInventoriesService(prisma, year);

    log.info("Carbon inventories retrieved successfully");
    return reply.status(200).send(data);
  } catch (error) {
    log.error({ error }, "Failed to retrieve carbon inventories");
    return reply.status(500).send({
      error: "Failed to retrieve carbon inventories",
    });
  }
};
