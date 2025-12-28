import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { carbonInventorySubcategoryKeys } from "./keys";

export interface CarbonInventorySubcategory {
  subcategoryId: number;
  selected: boolean;
  hasEditedLine: boolean;
}

export const useCarbonInventorySubcategories = (carbonInventoryId: string) => {
  return useQuery<CarbonInventorySubcategory[]>({
    queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${carbonInventoryId}/subcategories`)
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!carbonInventoryId,
  });
};
