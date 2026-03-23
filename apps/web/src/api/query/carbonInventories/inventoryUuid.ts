import { useAuth } from "@/contexts/AuthContext";

const INVENTORY_UUID_PREFIX = "carbon-inventory-uuid:";

export function saveInventoryUuid(inventoryId: string, uuid: string): void {
  localStorage.setItem(`${INVENTORY_UUID_PREFIX}${inventoryId}`, uuid);
}

export function getInventoryUuid(inventoryId: string): string | null {
  return localStorage.getItem(`${INVENTORY_UUID_PREFIX}${inventoryId}`);
}

/**
 * Returns headers with `x-carbon-inventory-uuid` when the user is not authenticated
 * and a UUID is stored in localStorage for the given inventory.
 */
export function useInventoryUuidHeader(inventoryId: string): {
  isAuthenticated: boolean;
  headers: Record<string, string>;
} {
  const { isAuthenticated } = useAuth();

  const headers: Record<string, string> = {};
  if (!isAuthenticated) {
    const uuid = getInventoryUuid(inventoryId);
    if (uuid) {
      headers["x-carbon-inventory-uuid"] = uuid;
    }
  }

  return { isAuthenticated, headers };
}
