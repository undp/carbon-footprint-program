import {
  OrganizationDisplayStatusValues,
  type GetOrganizationByIdResponse,
  type OrganizationDisplayStatus,
} from "@repo/types";
import { SubmissionStatus, type OrganizationSummaryView } from "@repo/database";

export const mapOrganizationSummaryToResponse = (
  org: OrganizationSummaryView
): GetOrganizationByIdResponse => {
  return {
    id: org.organizationId.toString(),
    name: org.name,
    taxId: org.taxId,
    legalName: org.legalName,
    tradeName: org.tradeName,
    status: org.displayStatus as OrganizationDisplayStatus,
    lastSubmissionStatus: org.lastSubmissionStatus,
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
    employeesCount: org.employeesCount,
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
