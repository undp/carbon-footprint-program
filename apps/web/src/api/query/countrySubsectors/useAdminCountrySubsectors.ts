import { useQuery } from "@tanstack/react-query";
import type {
  AdminListStatusFilter,
  GetAllAdminCountrySubsectorsResponse,
} from "@repo/types";
import { countrySubsectorKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useAdminCountrySubsectors = (status: AdminListStatusFilter) => {
  return useQuery<GetAllAdminCountrySubsectorsResponse>({
    queryKey: countrySubsectorKeys.admin(status),
    queryFn: () =>
      apiClient
        .get("admin/country-subsectors", { searchParams: { status } })
        .json(),
  });
};
