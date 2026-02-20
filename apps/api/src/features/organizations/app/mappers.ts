import {
  OrganizationDisplayStatusValues,
  type GetOrganizationByIdResponse,
  type OrganizationDisplayStatus,
} from "@repo/types";
import {
  SubmissionStatus,
  type OrganizationSummaryView,
  type OrganizationData,
  type CountrySector,
  type CountrySubsector,
  type CountryOrganizationSize,
  type OrganizationMainActivity,
  type CountryJobPosition,
} from "@repo/database";

export const mapOrganizationSummaryToResponse = (
  org: OrganizationSummaryView & {
    organizationData: OrganizationData & {
      sector: CountrySector | null;
      subsector: CountrySubsector | null;
      countryOrganizationSize: CountryOrganizationSize | null;
      mainActivity: OrganizationMainActivity | null;
      representativeCountryJobPosition: CountryJobPosition;
    };
  }
): GetOrganizationByIdResponse => {
  const orgData = org.organizationData;

  return {
    id: org.organizationId.toString(),
    name: org.name,
    taxId: orgData.taxId,
    legalName: orgData.legalName,
    tradeName: orgData.tradeName,
    status: org.displayStatus as OrganizationDisplayStatus,
    lastSubmissionStatus: org.lastSubmissionStatus as SubmissionStatus,
    hasUnsubmittedChanges: org.hasUnsubmittedChanges,
    isEditable:
      org.displayStatus !== OrganizationDisplayStatusValues.BLOCKED &&
      org.lastSubmissionStatus !== SubmissionStatus.PENDING,
    sector:
      orgData.sectorId && orgData.sector
        ? { id: orgData.sectorId.toString(), name: orgData.sector.name }
        : null,
    subsector:
      orgData.subsectorId && orgData.subsector
        ? { id: orgData.subsectorId.toString(), name: orgData.subsector.name }
        : null,
    countryOrganizationSize:
      orgData.countryOrganizationSizeId && orgData.countryOrganizationSize
        ? {
            id: orgData.countryOrganizationSizeId.toString(),
            name: orgData.countryOrganizationSize.name,
          }
        : null,
    mainActivity:
      orgData.mainActivityId && orgData.mainActivity
        ? {
            id: orgData.mainActivityId.toString(),
            name: orgData.mainActivity.name,
          }
        : null,
    address: orgData.address,
    employeesCount: orgData.employeesCount,
    representative: {
      fullName: orgData.representativeFullName,
      taxId: orgData.representativeTaxId,
      position: {
        id: orgData.representativeCountryJobPositionId.toString(),
        name: orgData.representativeCountryJobPosition.name,
      },
      email: orgData.representativeEmail,
      phone: orgData.representativePhone,
    },
  };
};
