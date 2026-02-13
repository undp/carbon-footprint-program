import type { FastifyReply, FastifyRequest } from "fastify";
import { deleteCategoryService } from "./service.js";
import type { DeleteCategoryParams } from "@repo/types";

export const deleteCategoryHandler = async (
  request: FastifyRequest<{ Params: DeleteCategoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "categories" });
  log.info({ categoryId: request.params.id }, "Deleting category...");

  const prisma = request.server.prisma;

  await deleteCategoryService(prisma, request.params.id);

  log.info(
    { categoryId: request.params.id },
    "Category deleted successfully"
  );
  return reply.status(200).send({
    message: "Category deleted successfully",
    id: request.params.id,
  });
};
