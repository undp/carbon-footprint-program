import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetMethodologyExportParams } from "@repo/types";
import { getMethodologyExportService } from "./service.js";

export const getMethodologyExportHandler = async (
  request: FastifyRequest<{ Params: GetMethodologyExportParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodologies" });
  const { id: methodologyId } = request.params;

  log.info({ methodologyId }, "Building methodology export payload...");

  const prisma = request.server.prisma;
  const result = await getMethodologyExportService(prisma, methodologyId);

  log.info({ methodologyId }, "Methodology export payload built successfully");
  return reply.status(200).send(result);
};
