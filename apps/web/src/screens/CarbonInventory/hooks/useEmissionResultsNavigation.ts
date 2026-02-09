import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";

export const useEmissionResultsNavigation = (inventoryId: string) => {
  const navigate = useNavigate();

  const goBack = () => {
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
      params: { inventoryId },
    });
  };

  const goToList = () => {
    void navigate({
      to: Routes.CARBON_INVENTORIES,
    });
  };

  return {
    goBack,
    goToList,
  };
};
