import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventoryBadgesService } from "./service.js";
import { GetCarbonInventoryBadgesParams } from "@repo/types";

export const getCarbonInventoryBadgesHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryBadgesParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });

  const { id } = request.params;
  log.info({ carbonInventoryId: id }, "Getting Carbon inventory badges");

  const data = await getCarbonInventoryBadgesService(
    request.server.prisma,
    request.server.storage,
    id
  );

  log.info("Carbon inventory badges found successfully");
  return reply.status(200).send(data);
};
