import type { FastifyReply, FastifyRequest } from "fastify";
import { ReviewSubmissionBody, ReviewSubmissionParams } from "@repo/types";
import { reviewSubmissionService } from "./service.js";

//TODO: Move this handler to submissions routes and folder
export const reviewSubmissionHandler = async (
  request: FastifyRequest<{
    Params: ReviewSubmissionParams;
    Body: ReviewSubmissionBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  const { id } = request.params;
  log.info(`Reviewing request ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser!; // guaranteed by the requireRoles hook
  const result = await reviewSubmissionService(
    prisma,
    id,
    request.body,
    user.id
  );

  log.info(`Request ${id} reviewed successfully`);
  return reply.status(200).send(result);
};
