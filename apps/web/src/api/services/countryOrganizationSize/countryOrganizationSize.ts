import { apiClient } from "@/api/http/client";
import { CountryOrganizationSize } from "./countryOrganizationSize.types";

export async function fetchCountryOrganizationSizes(): Promise<
  CountryOrganizationSize[]
> {
  return apiClient
    .get("country-organization-sizes")
    .json<CountryOrganizationSize[]>();
}
