import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { carbonInventorySubcategoryKeys } from "./keys";

export interface CarbonInventorySubcategory {
  subcategoryId: number;
  selected: boolean;
  hasEditedLine: boolean;
}

const MOCK_CARBON_INVENTORY_SUBCATEGORIES: CarbonInventorySubcategory[] = [
  { subcategoryId: 1531, selected: true, hasEditedLine: true },
  { subcategoryId: 1533, selected: true, hasEditedLine: false },
  { subcategoryId: 1535, selected: false, hasEditedLine: false },
  { subcategoryId: 1537, selected: true, hasEditedLine: true },
  { subcategoryId: 1539, selected: false, hasEditedLine: false },
  { subcategoryId: 1541, selected: true, hasEditedLine: false },
  { subcategoryId: 1890, selected: true, hasEditedLine: true },
  { subcategoryId: 1892, selected: true, hasEditedLine: false },
  { subcategoryId: 1894, selected: false, hasEditedLine: false },
  { subcategoryId: 2001, selected: true, hasEditedLine: true },
  { subcategoryId: 2003, selected: true, hasEditedLine: false },
  { subcategoryId: 2005, selected: false, hasEditedLine: false },
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
