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
  const organizationSearchParam =
    organizationId === "all"
      ? {}
      : organizationId === "none"
        ? { withoutOrganization: true }
        : { organizationId };

  return useQuery<GetAllCarbonInventoriesResponse>({
    queryKey: [
      ...carbonInventoryKeys.all,
      { year: normalizedYear },
      organizationSearchParam,
    ],
    queryFn: () =>
      apiClient
        .get("carbon-inventories", {
          searchParams: {
            ...(normalizedYear && { year: normalizedYear }),
            ...organizationSearchParam,
          },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
