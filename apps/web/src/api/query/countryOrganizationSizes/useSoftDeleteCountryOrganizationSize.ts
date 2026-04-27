import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountryOrganizationSizeResponse } from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountryOrganizationSizeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/country-organization-sizes/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countryOrganizationSizeKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: countryOrganizationSizeKeys.app.all,
      });
    },
  });
};
