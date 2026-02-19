import type { PrismaClient } from "@repo/database";
import {
  OrganizationDisplayStatusValues,
  type GetOrganizationByIdResponse,
  type OrganizationDisplayStatus,
} from "@repo/types";
import {
  OrganizationNotFoundError,
  OrganizationAccessDeniedError,
} from "../../errors.js";
import { SubmissionStatus, MembershipStatus } from "@repo/database";

export const getOrganizationByIdService = async (
  prismaClient: PrismaClient,
  userId: string,
  organizationId: string
): Promise<GetOrganizationByIdResponse> => {
  const org = await prismaClient.organizationSummaryView.findUnique({
    where: {
      organizationId: BigInt(organizationId),
    },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const membership = await prismaClient.userOrganizationMembership.findFirst({
    where: {
      userId: BigInt(userId),
      organizationId: BigInt(organizationId),
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new OrganizationAccessDeniedError(organizationId);
  }

  // Map to response format
  return {
    id: org.organizationId.toString(),
    name: org.name,
    taxId: org.taxId,
    legalName: org.legalName,
    tradeName: org.tradeName,
    status: org.displayStatus as OrganizationDisplayStatus,
    lastSubmissionStatus: org.lastSubmissionStatus as SubmissionStatus,
    hasUnsubmittedChanges: org.hasUnsubmittedChanges,
    isEditable:
      org.displayStatus !== OrganizationDisplayStatusValues.BLOCKED &&
      org.lastSubmissionStatus !== SubmissionStatus.PENDING,
    sector: org.sectorId
      ? {
          id: org.sectorId.toString(),
          name: org.sectorName!,
        }
      : null,
    subsector: org.subsectorId
      ? {
          id: org.subsectorId.toString(),
          name: org.subsectorName!,
        }
      : null,
    countryOrganizationSize: org.countryOrganizationSizeId
      ? {
          id: org.countryOrganizationSizeId.toString(),
          name: org.sizeName!,
        }
      : null,
    mainActivity: org.mainActivityId
      ? {
          id: org.mainActivityId.toString(),
          name: org.mainActivityName!,
        }
      : null,
    address: org.address,
    employeeCount: org.employeesCount,
    representative: {
      fullName: org.representativeFullName,
      taxId: org.representativeTaxId,
      position: {
        id: org.representativeCountryJobPositionId.toString(),
        name: org.representativePositionName,
      },
      email: org.representativeEmail,
      phone: org.representativePhone,
    },
  };
};
