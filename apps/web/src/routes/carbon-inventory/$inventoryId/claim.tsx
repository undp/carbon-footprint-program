import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "@/api/query/carbonInventories/keys";
import {
  getInventoryUuidFromLocalStorage,
  clearInventoryUuidFromLocalStorage,
} from "@/api/query/carbonInventories/authHeaders";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";
import { Routes } from "@/interfaces";

/**
 * Domain route that claims an anonymous draft for the just-authenticated user
 * and then sends them to the inventory list. The login flow points its generic
 * `returnTo` here once authenticated.
 *
 * Self-contained: the API call, user feedback, cache invalidation and navigation
 * all live here. It runs in a mounted component (not a `beforeLoad`) so the
 * SnackbarProvider is up and `useSnackbar` works — including on a cold load,
 * where notistack's standalone enqueueSnackbar is still undefined before React
 * mounts. Nothing about claiming leaks into the auth layer or the inventory list.
 *
 * Landing on the list — not the inventory's own screens — keeps their
 * owner-scoped queries from firing before the claim resolves (which would 403).
 * The claim runs once (ref-guarded for StrictMode) and navigates only after it
 * settles, so the list mounts with the draft already owned.
 */
function ClaimCarbonInventoryRoute() {
  const { inventoryId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const goToList = () =>
      void navigate({ to: Routes.CARBON_INVENTORIES, replace: true });

    const uuid = getInventoryUuidFromLocalStorage(inventoryId);
    if (!uuid) {
      // Nothing to claim (cleared, expired, different device, or direct access).
      enqueueSnackbar("No se pudo recuperar el inventario.", {
        variant: "error",
      });
      goToList();
      return;
    }

    void (async () => {
      try {
        await apiClient.post(`carbon-inventories/${inventoryId}/claim`, {
          headers: { "x-carbon-inventory-uuid": uuid },
        });
        clearInventoryUuidFromLocalStorage(inventoryId);
        await queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        });
        enqueueSnackbar("Tu borrador fue guardado.", { variant: "success" });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to claim carbon inventory:", error);
        enqueueSnackbar(
          "No se pudo guardar el inventario. Es posible que ya esté asociado a otro usuario.",
          { variant: "error" }
        );
      } finally {
        goToList();
      }
    })();
  }, [inventoryId, navigate, queryClient, enqueueSnackbar]);

  // beforeLoad-free: this only shows briefly while the claim above resolves.
  return <RouteLoadingFallback />;
}

export const Route = createFileRoute("/carbon-inventory/$inventoryId/claim")({
  component: ClaimCarbonInventoryRoute,
});
