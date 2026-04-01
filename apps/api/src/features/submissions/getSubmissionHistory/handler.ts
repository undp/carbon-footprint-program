import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetSubmissionHistoryQuery } from "@repo/types";
import { SystemRole } from "@repo/database";
import { getSubmissionHistoryService } from "./service.js";

export const getSubmissionHistoryHandler = async (
  request: FastifyRequest<{ Querystring: GetSubmissionHistoryQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching submission history...");

  const prisma = request.server.prisma;
  const blobServiceClient = request.server.blobServiceClient ?? null;
  const containerName = request.server.storageContainerName ?? null;

  const currentUser = request.currentUser!;
  const user = {
    id: BigInt(currentUser.id),
    isSystemAdmin:
      currentUser.role === SystemRole.ADMIN ||
      currentUser.role === SystemRole.SUPERADMIN,
  };

  const result = await getSubmissionHistoryService(
    prisma,
    blobServiceClient,
    containerName,
    request.query,
    user
  );

  log.info("Submission history fetched");
  return reply.status(200).send(result);
};
