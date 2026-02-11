import type {
  CountryJobPosition,
  CountryOrganizationSize,
  CountrySector,
  CountrySubsector,
  OrganizationData,
} from "@repo/database";
import type { GetOrganizationByIdResponse } from "@repo/types";

export type OrganizationDataWithRelations = OrganizationData & {
  countryOrganizationSize: CountryOrganizationSize | null;
  sector: CountrySector | null;
  subsector: CountrySubsector | null;
  representativeCountryJobPosition: CountryJobPosition;
};

export const mapOrganizationDataToResponse = (
  data: OrganizationDataWithRelations
): GetOrganizationByIdResponse => ({
  organizationData: {
    legalName: data.legalName,
    tradeName: data.tradeName,
    taxId: data.taxId,
    organizationSize: data.countryOrganizationSize
      ? {
          id: data.countryOrganizationSize.id.toString(),
          name: data.countryOrganizationSize.name,
        }
      : null,
    sector: data.sector?.name
      ? {
          id: data.sector.id.toString(),
          name: data.sector.name,
        }
      : null,
    subsector: data.subsector?.name
      ? {
          id: data.subsector.id.toString(),
          name: data.subsector.name,
        }
      : null,
    numberOfEmployees: data.workersCount,
    address: data.address,
  },
  representativeData: {
    fullName: data.representativeFullName,
    taxId: data.representativeTaxId,
    position: {
      id: data.representativeCountryJobPosition.id.toString(),
      name: data.representativeCountryJobPosition.name,
    },
    phone: data.representativePhone,
    email: data.representativeEmail,
  },
});
