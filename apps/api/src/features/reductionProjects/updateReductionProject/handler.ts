import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateReductionProjectParams,
  UpdateReductionProjectRequest,
} from "@repo/types";
import { updateReductionProjectService } from "./service.js";

export const updateReductionProjectHandler = async (
  request: FastifyRequest<{
    Params: UpdateReductionProjectParams;
    Body: UpdateReductionProjectRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const { id } = request.params;
  log.info(`Updating reduction project ${id}...`);

  const data = await updateReductionProjectService(
    request.server.prisma,
    id,
    request.body,
    request.currentUser ?? null
  );

  log.info(`Reduction project ${id} updated successfully`);
  return reply.status(200).send(data);
};
