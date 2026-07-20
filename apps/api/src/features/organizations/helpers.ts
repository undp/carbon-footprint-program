import type { PrismaClient, Prisma, OrganizationData } from "@repo/database";
import {
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import type { OrganizationMutationData } from "@repo/types";
import { toNullableBigInt } from "@/utils/bigint.js";
import { OrganizationIdExtractor } from "../../plugins/app/organizationAuthorizationPlugin.js";
import { LegalNameAlreadyAccreditedError } from "./errors.js";

export const organizationIdRequestExtractor: OrganizationIdExtractor = (
  request
) => request.params.organizationId;

export const getPendingOrganizationData = (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string
) => {
  return prisma.organizationData.findFirst({
    where: {
      organizationId: BigInt(organizationId),
      status: OrganizationDataStatus.ACTIVE,
      submission: {
        subject: {
          submissions: {
            some: {
              status: SubmissionStatus.PENDING,
            },
          },
        },
      },
    },
  });
};

export const getDraftOrganizationData = (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string
) => {
  return prisma.organizationData.findFirst({
    where: {
      organizationId: BigInt(organizationId),
      status: OrganizationDataStatus.ACTIVE,
      submission: null,
    },
  });
};

export const hasApprovedOrganizationData = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string
) =>
  Boolean(
    await prisma.organizationData.findFirst({
      where: {
        organizationId: BigInt(organizationId),
        submission: {
          subject: {
            submissions: {
              some: {
                status: {
                  in: [
                    SubmissionStatus.APPROVED,
                    SubmissionStatus.APPROVED_AUTOMATICALLY,
                  ],
                },
              },
            },
          },
        },
      },
    })
  );

/**
 * Rejects accrediting an organization when another organization in the same
 * country is already accredited (inscrita) with the same legal name (razón
 * social). Comparison mirrors the length-check trim in
 * `OrganizationMutationDataSchema` plus a case-insensitive match, so
 * "  Acme SpA " and "acme spa" collide. Excludes the organization itself so its
 * own re-accreditation does not conflict.
 *
 * "Accredited" is derived state (see `hasApprovedOrganizationData`): the check
 * reads it live from the approved organization data, so there is no denormalized
 * key to keep in sync. It runs inside the approval transaction as an
 * application-level guard; there is intentionally no DB unique constraint, so a
 * pair of concurrent approvals of the same legal name could in theory both pass
 * (TOCTOU) — accepted as extremely unlikely for a manual admin action.
 */
export const assertLegalNameAvailableForAccreditation = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  {
    organizationId,
    countryId,
    legalName,
  }: { organizationId: bigint; countryId: bigint; legalName: string }
): Promise<void> => {
  const conflict = await prisma.organizationData.findFirst({
    where: {
      organizationId: { not: organizationId },
      legalName: { equals: legalName.trim(), mode: "insensitive" },
      organization: { countryId },
      submission: {
        subject: {
          submissions: {
            some: {
              status: {
                in: [
                  SubmissionStatus.APPROVED,
                  SubmissionStatus.APPROVED_AUTOMATICALLY,
                ],
              },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  if (conflict) {
    throw new LegalNameAlreadyAccreditedError(legalName);
  }
};

export const getLastReviewedOrganizationData = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string
) => {
  return prisma.organizationData.findFirst({
    where: {
      organizationId: BigInt(organizationId),
      status: OrganizationDataStatus.ACTIVE,
      submission: {
        subject: {
          submissions: {
            some: {
              status: SubmissionStatus.REVIEWED,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const createOrganizationDataSubmission = (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationDataId: string,
  userId: string
) => {
  return prisma.submission.create({
    data: {
      type: SubmissionType.ORGANIZATION_ACCREDITATION,
      status: SubmissionStatus.PENDING,
      creator: {
        connect: {
          id: BigInt(userId),
        },
      },
      subject: {
        create: {
          creator: {
            connect: {
              id: BigInt(userId),
            },
          },
          organizationData: {
            create: {
              organizationDataId: BigInt(organizationDataId),
            },
          },
        },
      },
    },
  });
};

const mapOrganizationMutationData = (data: OrganizationMutationData) => {
  return {
    legalName: data.legalName,
    tradeName: data.tradeName || null,
    taxId: data.taxId || null,
    address: data.address || null,
    employeesCount: data.employeesCount,

    representativeFullName: data.representativeFullName || null,
    representativeTaxId: data.representativeTaxId || null,
    representativePhone: data.representativePhone || null,
    representativeEmail: data.representativeEmail || null,

    countryOrganizationSizeId: toNullableBigInt(data.countryOrganizationSizeId),
    sectorId: toNullableBigInt(data.sectorId),
    subsectorId: toNullableBigInt(data.subsectorId),
    mainActivityId: toNullableBigInt(data.mainActivityId),
    representativeCountryJobPositionId: toNullableBigInt(
      data.representativePositionId
    ),
  };
};

export const createOrganizationData = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  userId: string,
  data: OrganizationMutationData
) => {
  return prisma.organizationData.create({
    data: {
      organizationId: BigInt(organizationId),
      createdById: BigInt(userId),
      ...mapOrganizationMutationData(data),
    },
  });
};

export const updateOrganizationData = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  organizationDataId: string,
  userId: string,
  data: OrganizationMutationData
) => {
  return prisma.organizationData.update({
    where: {
      id: BigInt(organizationDataId),
    },
    data: {
      updatedById: BigInt(userId),
      ...mapOrganizationMutationData(data),
    },
  });
};

export const cloneOrganizationData = (
  prisma: PrismaClient | Prisma.TransactionClient,
  source: OrganizationData,
  userId: string
) => {
  return prisma.organizationData.create({
    data: {
      organizationId: source.organizationId,
      createdById: BigInt(userId),
      legalName: source.legalName,
      tradeName: source.tradeName,
      taxId: source.taxId,
      address: source.address,
      employeesCount: source.employeesCount,
      representativeFullName: source.representativeFullName,
      representativeTaxId: source.representativeTaxId,
      representativePhone: source.representativePhone,
      representativeEmail: source.representativeEmail,
      countryOrganizationSizeId: source.countryOrganizationSizeId,
      sectorId: source.sectorId,
      subsectorId: source.subsectorId,
      mainActivityId: source.mainActivityId,
      representativeCountryJobPositionId:
        source.representativeCountryJobPositionId,
    },
  });
};
