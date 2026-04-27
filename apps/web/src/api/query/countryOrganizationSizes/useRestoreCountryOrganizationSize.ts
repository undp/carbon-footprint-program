import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountryOrganizationSizeResponse } from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useRestoreCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountryOrganizationSizeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-organization-sizes/${id}/restore`).json(),
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
