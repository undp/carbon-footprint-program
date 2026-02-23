import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useCallback } from "react";

export const useEmissionCaptureNavigation = (inventoryId: string) => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  const goNext = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  return { goBack, goNext };
};
