import { useQuery } from "@tanstack/react-query";
import { GetAllCountryOrganizationSizesResponse } from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useCountryOrganizationSizes = () => {
  return useQuery<GetAllCountryOrganizationSizesResponse>({
    queryKey: countryOrganizationSizeKeys.app,
    queryFn: () => apiClient.get("country-organization-sizes").json(),
    staleTime: STALE_TIME_MS,
  });
};
