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
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  const { storageAccountName, storageContainerName } = request.server;

  log.info({ uuid }, "Generating download URL...");

  const prisma = request.server.prisma;
  const result = await downloadFileService(
    prisma,
    blobServiceClient,
    storageAccountName!,
    storageContainerName!,
    uuid
  );

  log.info({ uuid }, "Download URL generated");

  return reply.status(200).send(result);
};
