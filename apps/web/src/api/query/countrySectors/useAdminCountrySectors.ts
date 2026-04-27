import { useQuery } from "@tanstack/react-query";
import type {
  AdminListStatusFilter,
  GetAllAdminCountrySectorsResponse,
} from "@repo/types";
import { countrySectorKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useAdminCountrySectors = (status: AdminListStatusFilter) => {
  return useQuery<GetAllAdminCountrySectorsResponse>({
    queryKey: countrySectorKeys.admin.list(status),
    queryFn: () =>
      apiClient
        .get("admin/country-sectors", {
          searchParams: { status },
        })
        .json(),
  });
};
