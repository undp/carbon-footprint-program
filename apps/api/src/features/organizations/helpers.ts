import type { PrismaClient, Prisma } from "@repo/database";
import {
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionSubjectType,
} from "@repo/database";
import type { OrganizationMutationData } from "@repo/types";

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
      status: SubmissionStatus.PENDING,
      creator: {
        connect: {
          id: BigInt(userId),
        },
      },
      subject: {
        create: {
          subjectType: SubmissionSubjectType.ORGANIZATION_ACCREDITATION,
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

      legalName: data.legalName,
      tradeName: data.tradeName,
      taxId: data.taxId,
      address: data.address,
      employeesCount: data.employeesCount,

      representativeFullName: data.representativeFullName,
      representativeTaxId: data.representativeTaxId,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,

      countryOrganizationSizeId: BigInt(data.countryOrganizationSizeId),
      sectorId: BigInt(data.sectorId),
      subsectorId: BigInt(data.subsectorId),
      mainActivityId: BigInt(data.mainActivityId),
      representativeCountryJobPositionId: BigInt(data.representativePositionId),
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

      legalName: data.legalName,
      tradeName: data.tradeName,
      taxId: data.taxId,
      address: data.address,
      employeesCount: data.employeesCount,

      representativeFullName: data.representativeFullName,
      representativeTaxId: data.representativeTaxId,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,

      countryOrganizationSizeId: BigInt(data.countryOrganizationSizeId),
      sectorId: BigInt(data.sectorId),
      subsectorId: BigInt(data.subsectorId),
      mainActivityId: BigInt(data.mainActivityId),
      representativeCountryJobPositionId: BigInt(data.representativePositionId),
    },
  });
};
