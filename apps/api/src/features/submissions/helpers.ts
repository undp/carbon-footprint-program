import {
  MembershipStatus,
  Prisma,
  SubmissionFileType,
  SubmissionStatus,
  type PrismaClient,
} from "@repo/database";
import { SubmissionForbiddenError } from "./errors.js";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  SubmissionHistoryEntry,
  GetSubmissionHistoryQuery,
  SubmissionEventType,
} from "@repo/types";
import {
  ReadSasUrlSigner,
  createReadSasUrlSigner,
} from "../../services/blobService.js";
import { StorageNotConfiguredError } from "../files/errors.js";
import { mapOrgSummaryToCommonFields } from "./mappers.js";

export type SubmissionHistoryFileRow = {
  uuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  blobPath: string;
  createdAt: Date;
};

export type GroupedSubmissionHistoryFiles = {
  attachments: SubmissionHistoryFileRow[];
  recognitions: SubmissionHistoryFileRow[];
  revisionAttachments: SubmissionHistoryFileRow[];
};

export type SubmissionHistoryFileLink = {
  type: SubmissionFileType;
  file: SubmissionHistoryFileRow;
};

/**
 * Derives a user-facing event type from the raw submission status.
 */
export function deriveEventType(status: SubmissionStatus): SubmissionEventType {
  switch (status) {
    case SubmissionStatus.PENDING:
      return SubmissionEventType.POSTULATION;
    case SubmissionStatus.APPROVED_AUTOMATICALLY:
      return SubmissionEventType.APPROVED_AUTOMATICALLY;
    case SubmissionStatus.APPROVED:
      return SubmissionEventType.APPROVED;
    case SubmissionStatus.REJECTED:
      return SubmissionEventType.REJECTED;
    case SubmissionStatus.OBJECTED:
      return SubmissionEventType.OBJECTED;
    default:
      return SubmissionEventType.POSTULATION;
  }
}

/**
 * Groups submission files once so the timeline mapper can reuse the buckets.
 */
export function groupSubmissionHistoryFiles(
  files: SubmissionHistoryFileLink[]
): GroupedSubmissionHistoryFiles {
  return files.reduce<GroupedSubmissionHistoryFiles>(
    (grouped, fileLink) => {
      switch (fileLink.type) {
        case SubmissionFileType.ATTACHMENT:
          grouped.attachments.push(fileLink.file);
          break;
        case SubmissionFileType.RECOGNITION:
          grouped.recognitions.push(fileLink.file);
          break;
        case SubmissionFileType.REVISION_ATTACHMENT:
          grouped.revisionAttachments.push(fileLink.file);
          break;
      }

      return grouped;
    },
    {
      attachments: [],
      recognitions: [],
      revisionAttachments: [],
    }
  );
}

/**
 * Ensures the user has an active membership in the target organization.
 */
export async function verifyUserOrganizationMembership(
  prisma: PrismaClient,
  userId: bigint,
  organizationId: bigint
): Promise<void> {
  const membership = await prisma.userOrganizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new SubmissionForbiddenError(organizationId.toString());
  }
}

export const submissionHistorySelect = {
  id: true,
  type: true,
  status: true,
  reviewComments: true,
  createdAt: true,
  reviewedAt: true,
  creator: {
    select: { firstName: true, lastName: true },
  },
  reviewer: {
    select: { firstName: true, lastName: true },
  },
  subject: {
    select: {
      carbonInventory: {
        select: { carbonInventoryId: true },
      },
    },
  },
  files: {
    select: {
      type: true,
      file: {
        select: {
          uuid: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          blobPath: true,
          createdAt: true,
        },
      },
    },
    orderBy: { file: { createdAt: "desc" } },
  },
} satisfies Prisma.SubmissionSelect;

export type SubmissionHistoryRow = Prisma.SubmissionGetPayload<{
  select: typeof submissionHistorySelect;
}>;

export type SubmissionHistoryUser = {
  id: bigint;
  isSystemAdmin: boolean;
};

export type HistoryScope = {
  organizationId: bigint;
  carbonInventoryId: string | null;
  selfDeclaredAt: Date | null;
  submissionWhere: Prisma.SubmissionWhereInput;
};

export type HistoryContext = {
  organizationId: bigint;
  organizationIdString: string;
  organizationData: ReturnType<typeof mapOrgSummaryToCommonFields> | null;
  orgName: string | null;
};

/**
 * Builds the data-access scope for the submission history endpoint.
 *
 * This helper handles both supported query modes:
 * by `carbonInventoryId` and by `organizationId`. It loads the owning
 * organization, enforces membership for non-admin users, captures the
 * self-declaration timestamp when the timeline is inventory-based, and
 * returns the Prisma `where` clause the service uses to fetch the matching
 * submissions for the modal timeline.
 */
export async function determineSubmissionScope(
  prisma: PrismaClient,
  query: GetSubmissionHistoryQuery,
  user: SubmissionHistoryUser
): Promise<HistoryScope | null> {
  if (query.carbonInventoryId) {
    const carbonInventoryId = BigInt(query.carbonInventoryId);
    const carbonInventory = await prisma.carbonInventory.findUnique({
      where: { id: carbonInventoryId },
      select: {
        organizationId: true,
        selfDeclaredAt: true,
      },
    });

    if (!carbonInventory?.organizationId) {
      return null;
    }

    if (!user.isSystemAdmin) {
      await verifyUserOrganizationMembership(
        prisma,
        user.id,
        carbonInventory.organizationId
      );
    }

    return {
      organizationId: carbonInventory.organizationId,
      carbonInventoryId: query.carbonInventoryId,
      selfDeclaredAt: carbonInventory.selfDeclaredAt ?? null,
      submissionWhere: {
        subject: {
          carbonInventory: {
            carbonInventoryId,
          },
        },
      },
    };
  }

  const organizationId = BigInt(query.organizationId!);

  if (!user.isSystemAdmin) {
    await verifyUserOrganizationMembership(prisma, user.id, organizationId);
  }

  return {
    organizationId,
    carbonInventoryId: null,
    selfDeclaredAt: null,
    submissionWhere: {
      subject: {
        organizationData: {
          organizationData: {
            organizationId,
          },
        },
      },
    },
  };
}

/**
 * Fetches the shared organization metadata reused across all timeline entries.
 */
export async function fetchOrgHistoryDetails(
  prisma: PrismaClient,
  organizationId: bigint
): Promise<HistoryContext> {
  const orgSummary = await prisma.organizationSummaryView.findUnique({
    where: { organizationId },
  });

  return {
    organizationId,
    organizationIdString: organizationId.toString(),
    orgName: orgSummary?.name ?? null,
    organizationData: orgSummary
      ? mapOrgSummaryToCommonFields(orgSummary)
      : null,
  };
}

/**
 * Creates a request-scoped read signer only when the history includes files.
 */
export async function createHistoryReadSasSigner(
  submissions: SubmissionHistoryRow[],
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null
): Promise<ReadSasUrlSigner | null> {
  const hasFiles = submissions.some(
    (submission) => submission.files.length > 0
  );

  if (!hasFiles) {
    return null;
  }

  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  return createReadSasUrlSigner(blobServiceClient, containerName);
}

export function buildSubmissionBaseEntry(
  submission: SubmissionHistoryRow,
  context: HistoryContext
) {
  return {
    submissionId: submission.id.toString(),
    submissionType: submission.type,
    status: submission.status,
    userMetadata: context.orgName,
    carbonInventoryId:
      submission.subject.carbonInventory?.carbonInventoryId.toString() ?? null,
    organizationId: context.organizationIdString,
    organizationData: context.organizationData,
  };
}

export function buildSelfDeclarationEvent(
  scope: HistoryScope,
  context: HistoryContext
): SubmissionHistoryEntry | null {
  if (!scope.selfDeclaredAt || !scope.carbonInventoryId) {
    return null;
  }

  return {
    submissionId: null,
    submissionType: null,
    status: null,
    eventType: SubmissionEventType.SELF_DECLARATION,
    date: scope.selfDeclaredAt.toISOString(),
    userName: null,
    userMetadata: null,
    carbonInventoryId: scope.carbonInventoryId,
    organizationId: context.organizationIdString,
    organizationData: context.organizationData,
    comment: "",
    files: [],
    recognitions: [],
  };
}
