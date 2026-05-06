import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { toSafeString } from "@/utils/string";
import { OrganizationFormValues } from "./types";

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
    ...values,
    taxId: values.taxId || null,
    representativeEmail: values.representativeEmail || null,
    representativeFullName: values.representativeFullName || null,
    representativePhone: values.representativePhone || null,
    representativePositionId: values.representativePositionId || null,
    representativeTaxId: values.representativeTaxId || null,
    tradeName: values.tradeName || null,
    address: values.address || null,
    sectorId: values.sectorId || null,
    subsectorId: values.subsectorId || null,
    countryOrganizationSizeId: values.countryOrganizationSizeId || null,
    mainActivityId: values.mainActivityId || null,
    employeesCount: values.employeesCount,
  };
};
