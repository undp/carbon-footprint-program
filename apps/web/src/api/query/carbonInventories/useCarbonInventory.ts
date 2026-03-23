import { useQuery } from "@tanstack/react-query";
import { GetCarbonInventoryByIdResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useInventoryUuidHeader } from "./inventoryUuid";

export const useCarbonInventory = (id: string) => {
  const { headers } = useInventoryUuidHeader(id);

  return useQuery<GetCarbonInventoryByIdResponse>({
    queryKey: [...carbonInventoryKeys.detail(id), headers],
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}`, { headers }).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
