import { useQuery } from "@tanstack/react-query";
import { GetAllCarbonInventoriesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useCarbonInventories = (year?: string) => {
  return useQuery<GetAllCarbonInventoriesResponse>({
    queryKey: [...carbonInventoryKeys.all, { year }],
    queryFn: () =>
      apiClient
        .get("carbon-inventories", {
          searchParams: year && year !== "all" ? { year } : undefined,
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnMount: true,
    select: (data) =>
      data.filter((inventory) => inventory.status !== "DELETED"),
  });
};
