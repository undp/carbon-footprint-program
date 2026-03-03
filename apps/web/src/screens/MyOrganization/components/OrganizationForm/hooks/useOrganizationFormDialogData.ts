import { useMemo } from "react";
import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { mapOrganizationToFormValues } from "../../../transformers";

interface UseOrganizationFormDialogDataProps {
  organization?: GetOrganizationByIdResponse;
}

/**
 * Prepares initial form values for the OrganizationFormDialog based on organization data.
 * When editing an existing organization, maps the organization data to form values.
 * When creating a new organization, returns empty default values.
 *
 * @param {UseOrganizationFormDialogDataProps} params - Configuration object
 * @param {GetOrganizationByIdResponse} params.organization - Optional existing organization to edit
 * @returns {Object} Form data object
 * @returns {CreateOrganizationBody} defaultValues - Initial form values for the organization form
 */
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

export type UseOrganizationFormDialogDataReturn = ReturnType<
  typeof useOrganizationFormDialogData
>;
