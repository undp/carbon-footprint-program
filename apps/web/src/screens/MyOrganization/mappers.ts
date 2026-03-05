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
    representativePositionId: organization.representative.position.id,
    representativePhone: organization.representative.phone,
    representativeEmail: organization.representative.email,
  };
};

export const mapFormValuesToRequest = (
  values: OrganizationFormValues
): CreateOrganizationBody => {
  return {
    ...values,
    tradeName: values.tradeName || null,
    address: values.address || null,
    sectorId: values.sectorId || null,
    subsectorId: values.subsectorId || null,
    countryOrganizationSizeId: values.countryOrganizationSizeId || null,
    mainActivityId: values.mainActivityId || null,
    employeesCount:
      values.employeesCount !== null && values.employeesCount !== undefined
        ? Number(values.employeesCount)
        : null,
  };
};
