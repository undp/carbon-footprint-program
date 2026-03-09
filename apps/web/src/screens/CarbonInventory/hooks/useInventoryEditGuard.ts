import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isCarbonInventoryEditable } from "@repo/utils";
import { Routes } from "@/interfaces";
import type { CarbonInventoryDisplayStatus } from "@repo/types";

export function useInventoryEditGuard(
  inventoryId: string,
  status: CarbonInventoryDisplayStatus | undefined
) {
  const navigate = useNavigate();

  useEffect(() => {
    if (status && !isCarbonInventoryEditable(status)) {
      void navigate({
        to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
        params: { inventoryId },
        replace: true,
      });
    }
  }, [status, inventoryId, navigate]);

  const isChecking = status === undefined;
  const shouldRedirect = !isChecking && !isCarbonInventoryEditable(status);

  return { isChecking, shouldRedirect };
}
