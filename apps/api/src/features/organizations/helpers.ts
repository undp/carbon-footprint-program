import type { PrismaClient, Prisma, OrganizationData } from "@repo/database";
import {
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import type { OrganizationMutationData } from "@repo/types";
import { toNullableBigInt } from "@/utils/bigint.js";
import { OrganizationIdExtractor } from "../../plugins/app/organizationAuthorizationPlugin.js";

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
    tradeName: data.tradeName,
    taxId: data.taxId,
    address: data.address,
    employeesCount: data.employeesCount,

    representativeFullName: data.representativeFullName,
    representativeTaxId: data.representativeTaxId,
    representativePhone: data.representativePhone,
    representativeEmail: data.representativeEmail,

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
