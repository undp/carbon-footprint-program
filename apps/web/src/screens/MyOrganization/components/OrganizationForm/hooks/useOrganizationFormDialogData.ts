import {
  CreateOrganizationBody,
  GetOrganizationByIdResponse,
} from "@repo/types";
import { mapOrganizationToFormValues } from "../../../transformers";

interface UseOrganizationFormDialogDataProps {
  organization?: GetOrganizationByIdResponse;
}

const defaultValues: CreateOrganizationBody = {
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
};

export const useOrganizationFormDialogData = ({
  organization,
}: UseOrganizationFormDialogDataProps = {}) => {
  return {
    defaultValues: organization
      ? mapOrganizationToFormValues(organization)
      : defaultValues,
  };
};
