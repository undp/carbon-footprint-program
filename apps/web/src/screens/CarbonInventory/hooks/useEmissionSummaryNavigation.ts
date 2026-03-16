import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useCallback } from "react";

export const useEmissionSummaryNavigation = (inventoryId: string) => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  const goNext = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  const goToList = useCallback(() => {
    void navigate({ to: Routes.CARBON_INVENTORIES });
  }, [navigate]);

  const goToLanding = useCallback(() => {
    void navigate({ to: Routes.LANDING });
  }, [navigate]);

  return { goBack, goNext, goToList, goToLanding };
};
