import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryHistoryResponse } from "@repo/types";
import { SubmissionEventType } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../../carbonInventories/errors.js";
import {
  buildSelfDeclarationEvent,
  createHistoryReadSasSigner,
  getOrgSummaryDetails,
  submissionHistorySelect,
} from "../helpers.js";
import { mapTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";
import type { StorageAdapter } from "@repo/storage";

export const getCarbonInventoryHistoryService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  carbonInventoryId: string
): Promise<GetCarbonInventoryHistoryResponse> => {
  const ciId = BigInt(carbonInventoryId);
  const carbonInventory = await prisma.carbonInventory.findUnique({
    where: { id: ciId },
    select: {
      organizationId: true,
      year: true,
      selfDeclaredAt: true,
      selfDeclaredBy: { select: { email: true } },
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

  const signReadUrl = await createHistoryReadSasSigner(submissions, storage);

  const submissionEventGroups = await Promise.all(
    submissions.map((submission) =>
      mapSubmissionEventGroup(submission, orgHistorySummary, signReadUrl)
    )
  );

  if (carbonInventory.selfDeclaredAt) {
    submissionEventGroups.push({
      kind: SubmissionEventType.SELF_DECLARATION,
      selfDeclarationEvent: buildSelfDeclarationEvent(
        carbonInventoryId,
        carbonInventory.year,
        carbonInventory.selfDeclaredAt,
        orgHistorySummary,
        carbonInventory.selfDeclaredBy
      ),
    });
  }

  return mapTimelineResponse(submissionEventGroups);
};
