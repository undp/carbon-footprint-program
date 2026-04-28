import { useQuery } from "@tanstack/react-query";
import {
  GetAllOrganizationMainActivitiesQuery,
  GetAllOrganizationMainActivitiesResponse,
} from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

type Filters = GetAllOrganizationMainActivitiesQuery;

export const useOrganizationMainActivities = (filters?: Filters) => {
  return useQuery<GetAllOrganizationMainActivitiesResponse>({
    queryKey: organizationMainActivityKeys.app(filters),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (filters?.sectorId) {
        searchParams.set("sectorId", filters.sectorId);
      }
      if (filters?.subsectorId) {
        searchParams.set("subsectorId", filters.subsectorId);
      }

      return apiClient
        .get("organization-main-activities", {
          searchParams,
        })
        .json();
    },
    staleTime: STALE_TIME_MS,
    enabled: !filters?.subsectorId || !!filters?.sectorId,
  });
};
