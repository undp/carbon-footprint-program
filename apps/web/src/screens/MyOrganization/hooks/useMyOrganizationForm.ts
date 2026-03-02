import { useMemo } from "react";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { mapOrganizationToFormValues } from "../transformers";

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
    () =>
      organization
        ? mapOrganizationToFormValues(organization)
        : ({
            legalName: "",
            tradeName: "",
            taxId: "",
            address: "",
            sectorId: "",
            subsectorId: "",
            countryOrganizationSizeId: "",
            mainActivityId: "",
            employeesCount: 0,
            representativeFullName: "",
            representativeTaxId: "",
            representativePositionId: "",
            representativePhone: "",
            representativeEmail: "",
          } as CreateOrganizationBody),
    [organization]
  );

  return {
    initialData,
  };
};
