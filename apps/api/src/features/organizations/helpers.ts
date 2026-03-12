import type { PrismaClient, Prisma } from "@repo/database";
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

export const idRequestExtractor: OrganizationIdExtractor = (request) =>
  request.params.id;

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

export const getApprovedOrganizationData = (
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
              status: SubmissionStatus.APPROVED,
            },
          },
        },
      },
    },
  });
};

export const getRejectedOrganizationData = (
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
              status: SubmissionStatus.REJECTED,
            },
          },
        },
      },
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
    representativeCountryJobPositionId: BigInt(data.representativePositionId),
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
