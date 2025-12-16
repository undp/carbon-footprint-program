import { apiClient } from "@/api/http/client";
import { CountryOrganizationSize } from "./countryOrganizationSize.types";

export async function fetchCountryOrganizationSizes(): Promise<
  CountryOrganizationSize[]
> {
  return await apiClient
    .get("country-organization-sizes")
    .json<CountryOrganizationSize[]>();
}
