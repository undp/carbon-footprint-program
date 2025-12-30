import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { carbonInventorySubcategoryKeys } from "./keys";

export interface CarbonInventorySubcategory {
  subcategoryId: number;
  selected: boolean;
  hasEditedLine: boolean;
}

const MOCK_CARBON_INVENTORY_SUBCATEGORIES: CarbonInventorySubcategory[] = [
  { subcategoryId: 1, selected: true, hasEditedLine: true },
  { subcategoryId: 2, selected: true, hasEditedLine: false },
  { subcategoryId: 5, selected: true, hasEditedLine: false },
  { subcategoryId: 7, selected: true, hasEditedLine: true },
  { subcategoryId: 8, selected: true, hasEditedLine: false },
  { subcategoryId: 16, selected: true, hasEditedLine: true },
  { subcategoryId: 17, selected: true, hasEditedLine: false },
];

export const useCarbonInventorySubcategories = (carbonInventoryId: string) => {
  return useQuery<CarbonInventorySubcategory[]>({
    queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
    queryFn: async () => {
      // Simulando una llamada a la API
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_CARBON_INVENTORY_SUBCATEGORIES), 500);
      });
    },
    staleTime: STALE_TIME_MS,
    enabled: !!carbonInventoryId,
  });
};
