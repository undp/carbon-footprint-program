import { useMemo } from "react";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { mapOrganizationToFormValues } from "../../../transformers";

interface UseOrganizationFormDialogDataProps {
  organization?: GetOrganizationByIdResponse;
}

export const useOrganizationFormDialogData = ({
  organization,
}: UseOrganizationFormDialogDataProps = {}) => {
  const defaultValues: CreateOrganizationBody = useMemo(
    () =>
      organization
        ? mapOrganizationToFormValues(organization)
        : {
            legalName: "",
            tradeName: "",
            taxId: "",
            address: "",
            sectorId: "",
            subsectorId: "",
            countryOrganizationSizeId: "",
            mainActivityId: "",
            employeesCount: null,
            representativeFullName: "",
            representativeTaxId: "",
            representativePositionId: "",
            representativePhone: "",
            representativeEmail: "",
          },
    [organization]
  );

  return {
    defaultValues,
  };
};
