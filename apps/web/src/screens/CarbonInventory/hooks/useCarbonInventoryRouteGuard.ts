import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useSnackbar } from "notistack";
import { useCarbonInventoryAccess } from "@/hooks";

/**
 * Route guard for carbon inventory edit screens. Redirects when the user
 * lacks read access (to the inventories list) or when the server says editing
 * is not allowed (to the read-only summary screen).
 */
export function useCarbonInventoryRouteGuard(inventoryId: string) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { canAccess, canEdit, isReady } = useCarbonInventoryAccess(inventoryId);

  const mustNavigateAway = isReady && !canEdit;

  useEffect(() => {
    if (!mustNavigateAway) return;
    if (!canAccess) {
      // Read failed (e.g. 403) — the view screen would also fail, so bail out
      // of the feature entirely.
      void navigate({ to: Routes.CARBON_INVENTORIES, replace: true });
      enqueueSnackbar("No tienes acceso a esta huella", { variant: "info" });
      return;
    }
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
      params: { inventoryId },
      replace: true,
    });
    enqueueSnackbar("No puedes editar esta huella", { variant: "info" });
  }, [mustNavigateAway, canAccess, inventoryId, navigate, enqueueSnackbar]);

  return { isReady, mustNavigateAway };
}
