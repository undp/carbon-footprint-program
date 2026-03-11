import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestOrganizationAccreditationParams,
  RequestOrganizationAccreditationBody,
  RequestOrganizationAccreditationResponse,
} from "@repo/types";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { requestOrganizationAccreditationService } from "./service.js";

export const requestOrganizationAccreditationHandler = async (
  request: FastifyRequest<{
    Params: RequestOrganizationAccreditationParams;
    Body: RequestOrganizationAccreditationBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;
  const { fileUuids } = request.body ?? {};

  log.info(`Performing action on Organization ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { blobServiceClient, storageContainerName } = request.server;

  if (fileUuids?.length && (!blobServiceClient || !storageContainerName)) {
    throw new StorageNotConfiguredError();
  }

  const data: RequestOrganizationAccreditationResponse =
    await requestOrganizationAccreditationService(
      prisma,
      id,
      user,
      fileUuids,
      blobServiceClient ?? undefined,
      storageContainerName ?? undefined
    );

  log.info(`Organization ${id} action completed successfully`);

  return reply.status(200).send(data);
};
