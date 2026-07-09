import type { FastifyRequest, FastifyReply } from "fastify";
import type { PreviewLineFileParams } from "@repo/types";
import { previewLineFileService } from "./service.js";

export const previewLineFileHandler = async (
  request: FastifyRequest<{ Params: PreviewLineFileParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/previewLineFile",
  });
  const { id, uuid } = request.params;

  const result = await previewLineFileService(
    request.server.prisma,
    request.server.storage,
    { carbonInventoryId: id, uuid }
  );

  log.info(
    { uuid, carbonInventoryId: id },
    "Carbon inventory file preview URL generated"
  );
  return reply.status(200).send(result);
};
