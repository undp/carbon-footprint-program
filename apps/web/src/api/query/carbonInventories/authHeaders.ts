import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

const INVENTORY_UUID_PREFIX = "carbon-inventory-uuid:";

export function saveInventoryUuidToLocalStorage(
  inventoryId: string,
  uuid: string
): void {
  localStorage.setItem(`${INVENTORY_UUID_PREFIX}${inventoryId}`, uuid);
}

export function getInventoryUuidFromLocalStorage(
  inventoryId: string
): string | null {
  return localStorage.getItem(`${INVENTORY_UUID_PREFIX}${inventoryId}`);
}

/**
 * Returns headers with `x-carbon-inventory-uuid` when the user is not authenticated
 * and a UUID is stored in localStorage for the given inventory.
 */
export function useAuthorizationHeader(inventoryId: string): {
  isAuthenticated: boolean;
  headers: Record<string, string>;
} {
  const { isAuthenticated } = useAuth();

  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (!isAuthenticated) {
      const uuid = getInventoryUuidFromLocalStorage(inventoryId);
      if (uuid) {
        h["x-carbon-inventory-uuid"] = uuid;
      }
    }
    return h;
  }, [isAuthenticated, inventoryId]);

  return { isAuthenticated, headers };
}
