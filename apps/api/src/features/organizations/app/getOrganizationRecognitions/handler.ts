import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  GetOrganizationRecognitionsParams,
  GetOrganizationRecognitionsQuery,
} from "@repo/types";
import { getOrganizationRecognitionsService } from "./service.js";

export const getOrganizationRecognitionsHandler = async (
  request: FastifyRequest<{
    Params: GetOrganizationRecognitionsParams;
    Querystring: GetOrganizationRecognitionsQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;
  const { year, submissionTypes } = request.query;

  log.info(
    { organizationId: id, year, submissionTypes },
    "Getting organization recognitions..."
  );

  const prisma = request.server.prisma;
  const { blobServiceClient, storageContainerName } = request.server;
  const data = await getOrganizationRecognitionsService(
    prisma,
    id,
    year,
    submissionTypes,
    blobServiceClient,
    storageContainerName
  );

  log.info(
    { organizationId: id },
    "Organization recognitions retrieved successfully"
  );
  return reply.status(200).send(data);
};
