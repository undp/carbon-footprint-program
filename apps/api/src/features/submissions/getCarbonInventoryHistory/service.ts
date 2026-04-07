import type { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryHistoryResponse } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../../carbonInventories/errors.js";
import {
  buildSelfDeclarationEvent,
  createHistoryReadSasSigner,
  getOrgSummaryDetails,
  submissionHistorySelect,
} from "../helpers.js";
import { mapTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";

export const getCarbonInventoryHistoryService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null,
  carbonInventoryId: string
): Promise<GetCarbonInventoryHistoryResponse> => {
  const ciId = BigInt(carbonInventoryId);
  const carbonInventory = await prisma.carbonInventory.findUnique({
    where: { id: ciId },
    select: {
      organizationId: true,
      selfDeclaredAt: true,
      selfDeclaredBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!carbonInventory) {
    throw new CarbonInventoryNotFoundError(carbonInventoryId);
  }

  if (!carbonInventory.organizationId) {
    return [];
  }

  const [orgHistorySummary, submissions] = await Promise.all([
    getOrgSummaryDetails(prisma, carbonInventory.organizationId),
    prisma.submission.findMany({
      where: {
        subject: {
          carbonInventory: { carbonInventoryId: ciId },
        },
      },
      select: submissionHistorySelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const signReadSasUrl = await createHistoryReadSasSigner(
    submissions,
    blobServiceClient,
    containerName
  );

  const submissionEventGroups = await Promise.all(
    submissions.map((submission) =>
      mapSubmissionEventGroup(submission, orgHistorySummary, signReadSasUrl)
    )
  );

  const selfDeclarationEvent = carbonInventory.selfDeclaredAt
    ? buildSelfDeclarationEvent(
        carbonInventoryId,
        carbonInventory.selfDeclaredAt,
        orgHistorySummary,
        carbonInventory.selfDeclaredBy
      )
    : null;

  return mapTimelineResponse(submissionEventGroups, selfDeclarationEvent);
};
