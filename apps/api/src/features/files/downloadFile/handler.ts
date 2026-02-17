import type { FastifyRequest, FastifyReply } from "fastify";
import { StorageNotConfiguredError } from "../errors.js";
import { downloadFileService } from "./service.js";

export const downloadFileHandler = async (
  request: FastifyRequest<{
    Params: { uuid: string };
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files" });
  const { uuid } = request.params;

  const blobStorage = request.server.blobStorage;
  if (!blobStorage) {
    throw new StorageNotConfiguredError();
  }

  log.info({ uuid }, "Downloading file...");

  const prisma = request.server.prisma;
  const { stream, mimeType, originalName } = await downloadFileService(
    prisma,
    blobStorage,
    uuid
  );

  log.info({ uuid }, "File download started");

  return reply
    .header("Content-Type", mimeType)
    .header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(originalName)}"`
    )
    .send(stream);
};
