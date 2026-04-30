import { useQuery } from "@tanstack/react-query";
import type {
  AdminListStatusFilter,
  GetAllAdminOrganizationMainActivitiesResponse,
} from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useAdminOrganizationMainActivities = (
  status: AdminListStatusFilter
) => {
  return useQuery<GetAllAdminOrganizationMainActivitiesResponse>({
    queryKey: organizationMainActivityKeys.admin(status),
    queryFn: () =>
      apiClient
        .get("admin/organization-main-activities", { searchParams: { status } })
        .json(),
  });
};
