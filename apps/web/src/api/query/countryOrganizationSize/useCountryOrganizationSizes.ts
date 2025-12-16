import { useQuery } from "@tanstack/react-query";
import { fetchCountryOrganizationSizes } from "@/api/services/countryOrganizationSize";
import { countryOrganizationSizeKeys } from "./keys";

export function useCountryOrganizationSizes() {
  return useQuery({
    queryKey: countryOrganizationSizeKeys.list(),
    queryFn: fetchCountryOrganizationSizes,
    staleTime: 5 * 60 * 1000,
  });
}
