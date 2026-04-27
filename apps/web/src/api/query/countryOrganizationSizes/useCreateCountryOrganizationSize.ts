import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountryOrganizationSizeRequest,
  CreateCountryOrganizationSizeResponse,
} from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountryOrganizationSizeResponse,
    Error,
    CreateCountryOrganizationSizeRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-organization-sizes", { json: body }).json(),
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
