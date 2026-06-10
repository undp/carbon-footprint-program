import type { FastifyRequest, FastifyReply } from "fastify";
import type { RequestUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../errors.js";
import { requestUploadService } from "./service.js";

export const requestUploadHandler = async (
  request: FastifyRequest<{ Body: RequestUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/requestUpload" });
  const { originalName, fileType, sizeBytes, mimeType } = request.body;

  const { storageContainerName, blobServiceClient } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ fileType, sizeBytes, mimeType }, "Generating upload URL...");

  const result = await requestUploadService(
    blobServiceClient,
    storageContainerName,
    { originalName, fileType, sizeBytes, mimeType }
  );

  log.info({ uuid: result.uuid, fileType }, "Upload URL generated");
  return reply.status(200).send(result);
};
