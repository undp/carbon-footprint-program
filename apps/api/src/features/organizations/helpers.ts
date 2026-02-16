// helper.ts
// getApprovedOrganizationDataId bigint | null (OrganizationData ACTIVE & submission APPROVED)
// getRejectedOrganizationDataId bigint | null (OrganizationData ACTIVE & submission REJECTED)
// getPendingOrganizationDataId bigint | null (OrganizationData ACTIVE & submission PENDING)
// getDraftOrganizationDataId bigint | null (OrganizationData ACTIVE & submission NULL)

// updateOrganization service.ts
// const approvedOrganizationDataId = getApprovedOrganizationDataId(organizationId);
// const rejectedOrganizationDataId = getRejectedOrganizationDataId(organizationId);
// const pendingOrganizationDataId = getPendingOrganizationDataId(organizationId);
// const draftOrganizationDataId = getDraftOrganizationDataId(organizationId);

// if(pendingOrganizationDataId) throw new Error("Organization is under review");
// if(getDraftOrganizationDataId) update(draft)
// if(getApprovedOrganizationDataId) create(approved) + update(created) + submission(updated)

// getOrganizationById service.ts

// const approvedOrganizationDataId = getApprovedOrganizationDataId(organizationId);
// const rejectedOrganizationDataId = getRejectedOrganizationDataId(organizationId);
// const pendingOrganizationDataId = getPendingOrganizationDataId(organizationId);
// const draftOrganizationDataId = getDraftOrganizationDataId(organizationId);

// organizationDisplaySubmissionStatus (APPROVED, REJECTED, SUBMITTED, DRAFT)
// organizationDisplaySubmissionStatusValues (APPROVED, REJECTED, SUBMITTED, DRAFT)

// returns {
//   APPROVED: informationObject() | null,
//   REJECTED: informationObject | null,
//   SUBMITTED: informationObject | null,
//   DRAFT: informationObject | null,

// }

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
          subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
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
      organization: {
        connect: { id: BigInt(organizationId) },
      },
      creator: {
        connect: { id: BigInt(userId) },
      },
      status: OrganizationDataStatus.ACTIVE,

      legalName: data.legalName,
      tradeName: data.tradeName,
      taxId: data.taxId,
      address: data.address,
      employeesCount: data.employeesCount,

      representativeFullName: data.representativeFullName,
      representativeTaxId: data.representativeTaxId,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,

      countryOrganizationSize: {
        connect: { id: BigInt(data.countryOrganizationSizeId) },
      },
      sector: {
        connect: { id: BigInt(data.sectorId) },
      },
      subsector: {
        connect: { id: BigInt(data.subsectorId) },
      },
      mainActivity: {
        connect: { id: BigInt(data.mainActivityId) },
      },
      representativeCountryJobPosition: {
        connect: { id: BigInt(data.representativePositionId) },
      },
    },
  });
};

export const updateOrganizationData = async (
  prisma: PrismaClient,
  organizationDataId: string,
  userId: string,
  data: OrganizationMutationData
) => {
  return prisma.organizationData.update({
    where: {
      id: BigInt(organizationDataId),
    },
    data: {
      updater: {
        connect: { id: BigInt(userId) },
      },

      legalName: data.legalName,
      tradeName: data.tradeName,
      taxId: data.taxId,
      address: data.address,
      employeesCount: data.employeesCount,

      representativeFullName: data.representativeFullName,
      representativeTaxId: data.representativeTaxId,
      representativePhone: data.representativePhone,
      representativeEmail: data.representativeEmail,

      countryOrganizationSize: {
        connect: { id: BigInt(data.countryOrganizationSizeId) },
      },
      sector: {
        connect: { id: BigInt(data.sectorId) },
      },
      subsector: {
        connect: { id: BigInt(data.subsectorId) },
      },
      mainActivity: {
        connect: { id: BigInt(data.mainActivityId) },
      },
      representativeCountryJobPosition: {
        connect: { id: BigInt(data.representativePositionId) },
      },
    },
  });
};
