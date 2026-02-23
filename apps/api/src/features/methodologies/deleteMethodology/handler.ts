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
  const user = request.currentUser ?? null;

  await deleteMethodologyService(prisma, request.params.id, user);

  log.info(
    { methodologyId: request.params.id },
    "Methodology deleted successfully"
  );
  return reply.status(200).send({
    message: "Methodology deleted successfully",
    id: request.params.id,
  });
};
