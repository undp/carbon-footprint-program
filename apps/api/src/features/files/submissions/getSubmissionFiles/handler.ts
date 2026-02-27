import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  GetSubmissionFilesParams,
  GetSubmissionFilesQuery,
} from "@repo/types";
import { submissionGetFilesService } from "./service.js";

export const submissionGetFilesHandler = async (
  request: FastifyRequest<{
    Params: GetSubmissionFilesParams;
    Querystring: GetSubmissionFilesQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "files/submissions" });
  const { submissionId } = request.params;
  const query = request.query;

  log.info({ submissionId }, "Listing submission files...");

  const prisma = request.server.prisma;
  const result = await submissionGetFilesService(prisma, submissionId, query);

  log.info(
    { submissionId, count: result.length },
    "Submission files listed successfully"
  );
  return reply.status(200).send(result);
};
