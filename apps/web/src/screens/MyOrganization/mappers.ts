import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { toSafeString } from "@/utils/string";
import { TERRITORY_LEVEL_COUNT } from "./constants";
import { OrganizationFormValues } from "./types";

/**
 * Spreads the persisted territorial chain over the form's fixed set of selectors,
 * outermost first, padding the levels the organization left unanswered. The API
 * returns the ancestors already ordered outermost first, so appending the node
 * itself completes the chain.
 */
const mapTerritoryToFormValues = (
  organization: GetOrganizationByIdResponse
): string[] => {
  const chain = [
    ...organization.territoryAncestors.map((ancestor) => ancestor.id),
    ...(organization.territory ? [organization.territory.id] : []),
  ];
  return Array.from(
    { length: TERRITORY_LEVEL_COUNT },
    (_, level) => chain[level] ?? ""
  );
};

export const mapOrganizationToFormValues = (
  organization: GetOrganizationByIdResponse
): OrganizationFormValues => {
  return {
    legalName: organization.legalName,
    tradeName: toSafeString(organization.tradeName),
    taxId: organization.taxId,
    address: toSafeString(organization.address),
    sectorId: toSafeString(organization.sector?.id),
    subsectorId: toSafeString(organization.subsector?.id),
    secondarySubsectorId: toSafeString(organization.secondarySubsector?.id),
    territoryIds: mapTerritoryToFormValues(organization),
    countryOrganizationSizeId: toSafeString(
      organization.countryOrganizationSize?.id
    ),
    mainActivityId: toSafeString(organization.mainActivity?.id),
    employeesCount: organization.employeesCount,
    representativeFullName: organization.representative.fullName,
    representativeTaxId: organization.representative.taxId,
    representativePositionId: organization.representative.position?.id ?? null,
    representativePhone: organization.representative.phone,
    representativeEmail: organization.representative.email,
    files: [],
  };
};

export const mapFormValuesToRequest = (
  values: Omit<OrganizationFormValues, "files">
): CreateOrganizationBody => {
  return {
    legalName: values.legalName,
    tradeName: values.tradeName || null,
    taxId: values.taxId || null,
    countryOrganizationSizeId: values.countryOrganizationSizeId || null,
    sectorId: values.sectorId || null,
    subsectorId: values.subsectorId || null,
    secondarySubsectorId: values.secondarySubsectorId || null,
    // Only the innermost level the registrant answered is stored: its ancestors
    // are already implied by the hierarchy, so sending them would let the two
    // disagree.
    territoryId: values.territoryIds.filter(Boolean).at(-1) ?? null,
    employeesCount: values.employeesCount,
    address: values.address || null,
    mainActivityId: values.mainActivityId || null,
    representativeFullName: values.representativeFullName || null,
    representativeTaxId: values.representativeTaxId || null,
    representativePositionId: values.representativePositionId || null,
    representativePhone: values.representativePhone || null,
    representativeEmail: values.representativeEmail || null,
  };
};
