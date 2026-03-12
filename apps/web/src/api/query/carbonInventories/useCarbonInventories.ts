import { useQuery } from "@tanstack/react-query";
import { GetAllCarbonInventoriesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useCarbonInventories = (
  year?: string,
  organizationId?: string
) => {
  const normalizedYear = year === "all" ? undefined : year;
  const orgSearchParam =
    organizationId !== "all" && organizationId !== "none"
      ? organizationId
      : undefined;
  const withoutOrgSearchParam = organizationId === "none" ? true : undefined;

  return useQuery<GetAllCarbonInventoriesResponse>({
    queryKey: [
      ...carbonInventoryKeys.all,
      normalizedYear,
      orgSearchParam,
      withoutOrgSearchParam,
    ],
    queryFn: () =>
      apiClient
        .get("carbon-inventories", {
          searchParams: {
            ...(normalizedYear && { year: normalizedYear }),
            ...(orgSearchParam && { organizationId: orgSearchParam }),
            ...(withoutOrgSearchParam && { withoutOrganization: true }),
          },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
