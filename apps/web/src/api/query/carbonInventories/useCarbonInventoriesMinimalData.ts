import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import type {
  CarbonInventoryDisplayStatus,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";

export const useCarbonInventoriesMinimalData = (
  statuses?: CarbonInventoryDisplayStatus[],
  selfDeclared?: boolean
) =>
  useQuery<GetCarbonInventoriesMinimalResponse>({
    queryKey: [...carbonInventoryKeys.minimal, statuses, selfDeclared],
    queryFn: () => {
      const searchParams: Record<string, string> = {};
      if (statuses?.length) searchParams.statuses = statuses.join(",");
      if (selfDeclared !== undefined)
        searchParams.selfDeclared = String(selfDeclared);
      return apiClient
        .get("carbon-inventories/minimal", {
          searchParams: Object.keys(searchParams).length
            ? searchParams
            : undefined,
        })
        .json();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
