import { useQuery } from "@tanstack/react-query";
import type {
  AdminListStatusFilter,
  GetAllAdminCountryOrganizationSizesResponse,
} from "@repo/types";
import { countryOrganizationSizeKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useAdminCountryOrganizationSizes = (
  status: AdminListStatusFilter
) => {
  return useQuery<GetAllAdminCountryOrganizationSizesResponse>({
    queryKey: countryOrganizationSizeKeys.admin.list(status),
    queryFn: () =>
      apiClient
        .get("admin/country-organization-sizes", { searchParams: { status } })
        .json(),
  });
};
