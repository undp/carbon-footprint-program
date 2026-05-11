import type { FastifyRequest, FastifyReply } from "fastify";
import type { DeleteLineFileParams } from "@repo/types";
import { deleteLineFileService } from "./service.js";

export const deleteLineFileHandler = async (
  request: FastifyRequest<{ Params: DeleteLineFileParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventories/deleteLineFile",
  });
  const { id, uuid } = request.params;

  const prisma = request.server.prisma;
  const result = await deleteLineFileService(prisma, {
    carbonInventoryId: id,
    uuid,
  });

  log.info({ uuid, carbonInventoryId: id }, "Carbon inventory file deleted");
  return reply.status(200).send(result);
};
