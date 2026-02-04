import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { CarbonInventoryAvailableYearsResponse } from "@repo/types";

export const useCarbonInventoriesAvailableYears = () =>
  useQuery<CarbonInventoryAvailableYearsResponse>({
    queryKey: carbonInventoryKeys.availableYears,
    queryFn: () => apiClient.get("carbon-inventories/available-years").json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnMount: true,
  });
