import type { Prisma } from "@repo/database";
import { CarbonInventoryLineStatus, InventoryStatus } from "@repo/types";

/**
 * A capture that still pins the dimension value it selected. `isActive` alone
 * is not enough: deleting a line or a whole inventory only flips their own
 * status and leaves the input active. OUTDATED lines do count — they are the
 * lines hidden while manual total emissions are on, and they come back when
 * that is turned off.
 */
export const LIVE_CAPTURE_WHERE = {
  isActive: true,
  line: {
    status: { not: CarbonInventoryLineStatus.DELETED },
    carbonInventory: { status: InventoryStatus.ACTIVE },
  },
} satisfies Prisma.CarbonInventoryLineInputWhereInput;
