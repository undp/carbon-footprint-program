import { useQuery } from "@tanstack/react-query";
import { GetAllCarbonInventoriesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export function useCarbonInventories() {
  return useQuery<GetAllCarbonInventoriesResponse>({
    queryKey: carbonInventoryKeys.all,
    queryFn: () => apiClient.get("carbon-inventories").json(),
    staleTime: STALE_TIME_MS,
  });
}
