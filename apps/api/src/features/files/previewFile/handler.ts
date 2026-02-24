import type { FastifyRequest, FastifyReply } from "fastify";
import { StorageNotConfiguredError } from "../shared/errors.js";
import { previewFileService } from "./service.js";
import { PreviewFileParams } from "@repo/types";

export const previewFileHandler = async (
  request: FastifyRequest<{
    Params: PreviewFileParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid }, "Generating preview URL...");

  const prisma = request.server.prisma;
  const result = await previewFileService(prisma, blobServiceClient, uuid);

  log.info({ uuid }, "Preview URL generated");

  return reply.status(200).send(result);
};
