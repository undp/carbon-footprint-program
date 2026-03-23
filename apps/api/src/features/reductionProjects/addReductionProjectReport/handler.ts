import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AddReductionProjectReportParams,
  AddReductionProjectReportBody,
} from "@repo/types";
import { addReductionProjectReportService } from "./service.js";

export const addReductionProjectReportHandler = async (
  request: FastifyRequest<{
    Params: AddReductionProjectReportParams;
    Body: AddReductionProjectReportBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { id } = request.params;
  const body = request.body;

  log.info(`Adding report to reduction project ${id}...`);
  const result = await addReductionProjectReportService(
    prisma,
    id,
    body,
    user
  );

  log.info(`Report added to reduction project ${id}`);
  return reply.status(201).send(result);
};
