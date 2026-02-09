import type { FastifyReply, FastifyRequest } from "fastify";
import { deleteMethodologyService } from "./service.js";
import type { DeleteMethodologyParams } from "@repo/types";

export const deleteMethodologyHandler = async (
  request: FastifyRequest<{ Params: DeleteMethodologyParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodologies" });
  log.info({ methodologyId: request.params.id }, "Deleting methodology...");

  const prisma = request.server.prisma;
  const result = await deleteMethodologyService(prisma, request.params.id);

  if (!result.success) {
    if (result.error === "NOT_FOUND") {
      log.warn({ methodologyId: request.params.id }, "Methodology not found");
      return reply.status(404).send({
        code: "METHODOLOGY_NOT_FOUND",
        message: "Methodology not found",
      });
    }
    if (result.error === "HAS_ACTIVE_INVENTORIES") {
      log.warn(
        { methodologyId: request.params.id },
        "Methodology has active inventories"
      );
      return reply.status(409).send({
        code: "METHODOLOGY_HAS_ACTIVE_INVENTORIES",
        message: "Cannot delete methodology: it has active carbon inventories",
      });
    }
    if (result.error === "IS_PUBLISHED") {
      log.warn(
        { methodologyId: request.params.id },
        "Methodology is published"
      );
      return reply.status(409).send({
        code: "METHODOLOGY_IS_PUBLISHED",
        message: "Cannot delete methodology: it is published",
      });
    }
  }

  log.info(
    { methodologyId: request.params.id },
    "Methodology deleted successfully"
  );
  return reply.status(200).send({
    message: "Methodology deleted successfully",
    id: request.params.id,
  });
};
