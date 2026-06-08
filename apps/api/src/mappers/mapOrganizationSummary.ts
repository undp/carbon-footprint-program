import {
  OrganizationDisplayStatusValues,
  type GetOrganizationByIdResponse,
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

export type OrganizationSummaryWithData = OrganizationSummaryView & {
  organizationData: OrganizationData & {
    sector: CountrySector | null;
    subsector: CountrySubsector | null;
    countryOrganizationSize: CountryOrganizationSize | null;
    mainActivity: OrganizationMainActivity | null;
    representativeCountryJobPosition: CountryJobPosition | null;
  };
};

export const mapOrganizationSummary = (
  org: OrganizationSummaryWithData
): GetOrganizationByIdResponse => {
  const orgData = org.organizationData;

  return {
    id: org.organizationId.toString(),
    name: org.name,
    taxId: orgData.taxId,
    legalName: orgData.legalName,
    tradeName: orgData.tradeName,
    status: org.displayStatus,
    lastSubmissionStatus: org.lastSubmissionStatus,
    hasUnsubmittedChanges: org.hasUnsubmittedChanges,
    isEditable:
      org.displayStatus !== OrganizationDisplayStatusValues.BLOCKED &&
      org.lastSubmissionStatus !== SubmissionStatus.PENDING,
    sector: orgData.sector
      ? { id: orgData.sector.id.toString(), name: orgData.sector.name }
      : null,
    subsector: orgData.subsector
      ? { id: orgData.subsector.id.toString(), name: orgData.subsector.name }
      : null,
    countryOrganizationSize: orgData.countryOrganizationSize
      ? {
          id: orgData.countryOrganizationSize.id.toString(),
          name: orgData.countryOrganizationSize.name,
        }
      : null,
    mainActivity: orgData.mainActivity
      ? {
          id: orgData.mainActivity.id.toString(),
          name: orgData.mainActivity.name,
        }
      : null,
    address: orgData.address,
    employeesCount: orgData.employeesCount,
    representative: {
      fullName: orgData.representativeFullName,
      taxId: orgData.representativeTaxId,
      position: orgData.representativeCountryJobPosition
        ? {
            id: orgData.representativeCountryJobPosition.id.toString(),
            name: orgData.representativeCountryJobPosition.name,
          }
        : null,
      email: orgData.representativeEmail,
      phone: orgData.representativePhone,
    },
  };
};
