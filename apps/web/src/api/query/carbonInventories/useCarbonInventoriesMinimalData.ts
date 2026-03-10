import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import type {
  CarbonInventoryDisplayStatus,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";

export const useCarbonInventoriesMinimalData = (
  statuses?: CarbonInventoryDisplayStatus[]
) =>
  useQuery<GetCarbonInventoriesMinimalResponse>({
    queryKey: [...carbonInventoryKeys.minimal, statuses],
    queryFn: () =>
      apiClient
        .get("carbon-inventories/minimal", {
          searchParams: statuses?.length
            ? { statuses: statuses.join(",") }
            : undefined,
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
