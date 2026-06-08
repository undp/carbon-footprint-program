import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryMethodologyExportParams } from "@repo/types";
import { getCarbonInventoryMethodologyExportService } from "./service.js";

export const getCarbonInventoryMethodologyExportHandler = async (
  request: FastifyRequest<{
    Params: GetCarbonInventoryMethodologyExportParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/getCarbonInventoryMethodologyExport",
  });
  const { id } = request.params;

  const result = await getCarbonInventoryMethodologyExportService(
    request.server.prisma,
    id
  );

  log.info(
    { carbonInventoryId: id, methodologyVersionId: result.id },
    "Carbon inventory methodology export built"
  );
  return reply.status(200).send(result);
};
