import { useQuery } from "@tanstack/react-query";
import { GetCarbonInventoryByIdResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export function useCarbonInventory(id: string) {
  return useQuery<GetCarbonInventoryByIdResponse>({
    queryKey: carbonInventoryKeys.detail(id),
    queryFn: () => apiClient.get(`carbon-inventories/${id}`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
}
