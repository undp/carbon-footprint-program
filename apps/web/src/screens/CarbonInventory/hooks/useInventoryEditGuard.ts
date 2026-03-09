import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isCarbonInventoryEditable } from "@repo/utils";
import { Routes } from "@/interfaces";
import type { CarbonInventoryDisplayStatus } from "@repo/types";
import { useSnackbar } from "notistack";

export function useInventoryEditGuard(
  inventoryId: string,
  status: CarbonInventoryDisplayStatus | undefined
) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (status && !isCarbonInventoryEditable(status)) {
      void navigate({
        to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
        params: { inventoryId },
        replace: true,
      });
      enqueueSnackbar("La huella no es editable actualmente", {
        variant: "info",
      });
    }
  }, [status, inventoryId, navigate, enqueueSnackbar]);

  const isReady = status !== undefined;
  const shouldRedirect = isReady && !isCarbonInventoryEditable(status);

  return { isReady, shouldRedirect };
}
