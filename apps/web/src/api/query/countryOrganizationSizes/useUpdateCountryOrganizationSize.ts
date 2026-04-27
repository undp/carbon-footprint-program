import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountryOrganizationSizeRequest,
  UpdateCountryOrganizationSizeResponse,
} from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useUpdateCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountryOrganizationSizeResponse,
    Error,
    { id: string; body: UpdateCountryOrganizationSizeRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .patch(`admin/country-organization-sizes/${id}`, { json: body })
        .json(),
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
