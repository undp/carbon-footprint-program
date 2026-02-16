import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";

//TODO: REPLACE WITH API TYPES
export interface CreateOrganizationBody {
  legalName: string;
  tradeName: string;
  taxId: string;
  countryOrganizationSizeId: string;
  sectorId: string;
  subsectorId: string;
  employeeCount: string;
  address: string;
  representativeName: string;
  representativeTaxId: string;
  representativePositionId: string;
  representativePhone: string;
  representativeEmail: string;
  mainActivityId: string;
}

interface CreateOrganizationParams {
  data: CreateOrganizationBody;
}

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  //REPLACE WITH API TYPES
  return useMutation<unknown, Error, CreateOrganizationParams>({
    mutationFn: (data) => apiClient.post("organization", { json: data }).json(),
    onSuccess: () =>
      // Invalidate and refetch carbon inventories list
      void queryClient.invalidateQueries({
        queryKey: [organizationKeys.all],
        exact: true,
      }),
  });
};
