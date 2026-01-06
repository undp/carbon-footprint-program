import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { carbonInventorySubcategoryKeys } from "./keys";

export interface CarbonInventorySubcategorySummary {
  subcategoryId: string;
  included: boolean;
  edited: boolean;
}

const MOCK_CARBON_INVENTORY_SUBCATEGORIES: CarbonInventorySubcategorySummary[] =
  [
    { subcategoryId: "1", included: true, edited: true },
    { subcategoryId: "2", included: true, edited: false },
    { subcategoryId: "5", included: true, edited: false },
    { subcategoryId: "7", included: true, edited: true },
    { subcategoryId: "8", included: true, edited: false },
    { subcategoryId: "16", included: true, edited: true },
    { subcategoryId: "17", included: true, edited: false },
  ];

export const useCarbonInventorySubcategoriesSummary = (
  carbonInventoryId: string
) => {
  return useQuery<CarbonInventorySubcategorySummary[]>({
    queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
    queryFn: async () => {
      return new Promise((resolve) =>
        setTimeout(() => resolve(MOCK_CARBON_INVENTORY_SUBCATEGORIES), 500)
      );
    },
    staleTime: STALE_TIME_MS,
    enabled: !!carbonInventoryId,
  });
};
