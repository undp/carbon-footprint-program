import type { FastifyRequest, FastifyReply } from "fastify";
import { StorageNotConfiguredError } from "../shared/errors.js";
import { downloadFileService } from "./service.js";

export const downloadFileHandler = async (
  request: FastifyRequest<{
    Params: { uuid: string };
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  const blobServiceClient = request.server.blobServiceClient;
  if (!blobServiceClient) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid }, "Generating download URL...");

  const prisma = request.server.prisma;
  const result = await downloadFileService(prisma, blobServiceClient, uuid);

  log.info({ uuid }, "Download URL generated");

  return reply.status(200).send(result);
};
