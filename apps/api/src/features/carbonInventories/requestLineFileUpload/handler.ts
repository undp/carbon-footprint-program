import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestLineFileUploadBody,
  RequestLineFileUploadParams,
} from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { requestLineFileUploadService } from "./service.js";

export const requestLineFileUploadHandler = async (
  request: FastifyRequest<{
    Params: RequestLineFileUploadParams;
    Body: RequestLineFileUploadBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/requestLineFileUpload",
  });
  const { id } = request.params;
  const { originalName } = request.body;

  const { storageContainerName, blobServiceClient } = request.server;
  if (!blobServiceClient || !storageContainerName) {
    throw new StorageNotConfiguredError();
  }

  log.info({ carbonInventoryId: id }, "Generating line file upload URL...");

  const result = await requestLineFileUploadService(
    blobServiceClient,
    storageContainerName,
    { carbonInventoryId: id, originalName }
  );

  log.info(
    { uuid: result.uuid, carbonInventoryId: id },
    "Line file upload URL generated"
  );
  return reply.status(200).send(result);
};
