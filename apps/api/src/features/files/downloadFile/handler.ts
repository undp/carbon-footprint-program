import type { FastifyRequest, FastifyReply } from "fastify";
import { StorageNotConfiguredError } from "../errors.js";
import { downloadFileService } from "./service.js";
import { DownloadFileParams } from "@repo/types";

export const downloadFileHandler = async (
  request: FastifyRequest<{
    Params: DownloadFileParams;
  }>,
  reply: FastifyReply
) => {
  //TODO: Validate if user has access to the file before generating the URL
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  const { blobServiceClient, storageContainerName, prisma } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid }, "Generating download URL...");
  const result = await downloadFileService(
    prisma,
    blobServiceClient,
    storageContainerName,
    uuid
  );

  log.info({ uuid }, "Download URL generated");

  return reply.status(200).send(result);
};
