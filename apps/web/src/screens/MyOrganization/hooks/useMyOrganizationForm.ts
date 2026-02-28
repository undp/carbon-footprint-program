import { useMemo } from "react";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";

interface UseMyOrganizationFormProps {
  organization?: GetOrganizationByIdResponse;
}

/**
 * Prepares form initial data from organization data
 * Maps organization object to form structure
 */
export const useMyOrganizationForm = ({
  organization,
}: UseMyOrganizationFormProps = {}) => {
  const initialData: CreateOrganizationBody = useMemo(
    () => ({
      legalName: organization?.legalName ?? "",
      tradeName: organization?.tradeName ?? "",
      taxId: organization?.taxId ?? "",
      address: organization?.address ?? "",
      sectorId: organization?.sector?.id ?? "",
      subsectorId: organization?.subsector?.id ?? "",
      countryOrganizationSizeId:
        organization?.countryOrganizationSize?.id ?? "",
      mainActivityId: organization?.mainActivity?.id ?? "",
      employeesCount: organization?.employeesCount ?? 0,
      representativeFullName: organization?.representative.fullName ?? "",
      representativeTaxId: organization?.representative.taxId ?? "",
      representativePositionId: organization?.representative.position.id ?? "",
      representativePhone: organization?.representative.phone ?? "",
      representativeEmail: organization?.representative.email ?? "",
    }),
    [organization]
  );

  return {
    initialData,
  };
};
