import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetSubmissionWarningsParams } from "@repo/types";
import { getSubmissionWarningsService } from "./service.js";

export const getSubmissionWarningsHandler = async (
  request: FastifyRequest<{ Params: GetSubmissionWarningsParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Computing submission warnings...");

  const result = await getSubmissionWarningsService(
    request.server.prisma,
    request.params.id
  );

  log.info("Submission warnings computed");
  return reply.status(200).send(result);
};
