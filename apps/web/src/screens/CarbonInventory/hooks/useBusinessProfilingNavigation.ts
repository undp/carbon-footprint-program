import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useCallback } from "react";

export const useBusinessProfilingNavigation = (inventoryId: string) => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    void navigate({ to: Routes.HOME as string });
  }, [navigate]);

  const goNext = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION as string,
      params: { inventoryId },
    });
  }, [navigate, inventoryId]);

  return { goBack, goNext };
};
