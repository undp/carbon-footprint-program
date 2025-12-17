import { useQuery } from "@tanstack/react-query";
import { CountryOrganizationSize } from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "../../http";

async function fetchCountryOrganizationSizes(): Promise<
  CountryOrganizationSize[]
> {
  return apiClient
    .get("country-organization-sizes")
    .json<CountryOrganizationSize[]>();
}

export function useCountryOrganizationSizes() {
  return useQuery({
    queryKey: countryOrganizationSizeKeys.all,
    queryFn: fetchCountryOrganizationSizes,
    staleTime: 5 * 60 * 1000,
  });
}
