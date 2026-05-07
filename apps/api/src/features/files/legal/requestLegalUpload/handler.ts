import type { FastifyRequest, FastifyReply } from "fastify";
import type { RequestLegalUploadBody } from "@repo/types";
import { StorageNotConfiguredError } from "../../errors.js";
import { requestLegalUploadService } from "./service.js";

export const requestLegalUploadHandler = async (
  request: FastifyRequest<{ Body: RequestLegalUploadBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/legal" });
  const { originalName } = request.body;

  const { storageContainerName, blobServiceClient } = request.server;

  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ originalName }, "Generating legal upload URL...");

  const result = await requestLegalUploadService(
    blobServiceClient,
    storageContainerName,
    { originalName }
  );

  log.info({ uuid: result.uuid }, "Legal upload URL generated");
  return reply.status(200).send(result);
};
