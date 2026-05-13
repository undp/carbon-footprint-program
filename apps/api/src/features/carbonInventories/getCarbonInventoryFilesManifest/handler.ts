import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryFilesManifestParams } from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { getCarbonInventoryFilesManifestService } from "./service.js";

export const getCarbonInventoryFilesManifestHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryFilesManifestParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/getCarbonInventoryFilesManifest",
  });
  const { id } = request.params;

  const { blobServiceClient, storageContainerName } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  const result = await getCarbonInventoryFilesManifestService(
    request.server.prisma,
    blobServiceClient,
    storageContainerName,
    { carbonInventoryId: id }
  );

  log.info(
    { carbonInventoryId: id, fileCount: result.files.length },
    "Carbon inventory files manifest built"
  );
  return reply.status(200).send(result);
};
