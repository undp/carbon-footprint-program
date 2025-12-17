import { useQuery } from "@tanstack/react-query";
import { GetAllCountryOrganizationSizesResponse } from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "../../http";

export function useCountryOrganizationSizes() {
  return useQuery<GetAllCountryOrganizationSizesResponse>({
    queryKey: countryOrganizationSizeKeys.all,
    queryFn: () => apiClient.get("country-organization-sizes").json(),
    staleTime: 5 * 60 * 1000,
  });
}
