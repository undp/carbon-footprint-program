import type { FastifyReply, FastifyRequest } from "fastify";
import { GetCarbonInventoryMetadataParams } from "@repo/types";
import { getCarbonInventoryMetadataService } from "./service.js";

export const getCarbonInventoryMetadataHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryMetadataParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryMetadata" });
  const carbonInventoryId = request.params.id;

  log.info({ carbonInventoryId }, "Getting carbon inventory metadata...");

  const prisma = request.server.prisma;
  const data = await getCarbonInventoryMetadataService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Carbon inventory metadata retrieved successfully"
  );
  return reply.status(200).send(data);
};
