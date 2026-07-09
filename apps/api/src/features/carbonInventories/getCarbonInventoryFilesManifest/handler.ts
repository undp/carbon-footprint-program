import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryFilesManifestParams } from "@repo/types";
import { getCarbonInventoryFilesManifestService } from "./service.js";

export const getCarbonInventoryFilesManifestHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryFilesManifestParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/getCarbonInventoryFilesManifest",
  });
  const { id } = request.params;

  const result = await getCarbonInventoryFilesManifestService(
    request.server.prisma,
    request.server.storage,
    { carbonInventoryId: id }
  );

  log.info(
    { carbonInventoryId: id, fileCount: result.files.length },
    "Carbon inventory files manifest built"
  );
  return reply.status(200).send(result);
};
