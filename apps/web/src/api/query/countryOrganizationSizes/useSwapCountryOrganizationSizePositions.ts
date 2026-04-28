import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SwapCountryOrganizationSizePositionsRequest,
  SwapCountryOrganizationSizePositionsResponse,
} from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useSwapCountryOrganizationSizePositions = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SwapCountryOrganizationSizePositionsResponse,
    Error,
    SwapCountryOrganizationSizePositionsRequest
  >({
    mutationFn: (body) =>
      apiClient
        .post("admin/country-organization-sizes/swap-positions", { json: body })
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: countryOrganizationSizeKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: countryOrganizationSizeKeys.all,
      });
    },
  });
};
