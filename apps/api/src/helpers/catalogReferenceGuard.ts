import { type Prisma, InventoryStatus } from "@repo/database";
import { EditBlockedByReferencesError, attachDetails } from "@/errors/index.js";

/**
 * Counts the consumers that reference a profiling catalog row by id — the
 * organization-owned data that resolves the row's name (and parent) at read time
 * and would show a stale value after an identity edit. Shared by the four catalog
 * update services. Two consumers exist:
 *
 *  - live `organization_data.*Id` rows (matched by `organizationDataWhere`): the
 *    organization's saved profile, and
 *  - the frozen `carbon_inventory.organizationData` JSON snapshot of every ACTIVE
 *    huella (matched by `snapshotJsonKey`; the snapshot stores ids as strings —
 *    see `buildOrganizationDataSnapshot`). A DELETED huella's snapshot is inert,
 *    so only ACTIVE inventories are counted.
 *
 * These are deliberately NOT catalog children (maintainer config) — those are a
 * separate reference set that only a subsector re-parent also counts.
 *
 * Must run inside the caller's transaction so the counts and the guarded update
 * observe one consistent snapshot.
 */
export const countConsumerReferences = async (
  tx: Prisma.TransactionClient,
  args: {
    organizationDataWhere: Prisma.OrganizationDataWhereInput;
    snapshotJsonKey: "sectorId" | "subsectorId" | "sizeId" | "mainActivityId";
    id: bigint;
  }
): Promise<{ organizationDataCount: number; carbonInventoryCount: number }> => {
  const [organizationDataCount, carbonInventoryCount] = await Promise.all([
    tx.organizationData.count({ where: args.organizationDataWhere }),
    tx.carbonInventory.count({
      where: {
        status: InventoryStatus.ACTIVE,
        organizationData: {
          path: [args.snapshotJsonKey],
          equals: args.id.toString(),
        },
      },
    }),
  ]);
  return { organizationDataCount, carbonInventoryCount };
};

/**
 * Throws `EditBlockedByReferencesError` (HTTP 409, `EDIT_BLOCKED_BY_REFERENCES`)
 * for an identity edit blocked solely by consumers (organization profiles and
 * huellas), attaching the per-reference counts the frontend renders. Used by the
 * catalogs whose rename and re-parent are guarded by the same consumer set and
 * that have no catalog children of their own (sector, organization size, main
 * activity). Subsector composes its own error because ACTIVE catalog children
 * also block its re-parent.
 */
export const throwEditBlockedByConsumers = (args: {
  resourceType: string;
  attemptedChange: "name" | "parent";
  organizationDataCount: number;
  carbonInventoryCount: number;
}): never => {
  const referencedBy: string[] = [];
  if (args.organizationDataCount > 0) referencedBy.push("organization data");
  if (args.carbonInventoryCount > 0) referencedBy.push("carbon inventories");

  const error = new EditBlockedByReferencesError(referencedBy.join(", "));
  throw attachDetails(error, {
    resourceType: args.resourceType,
    attemptedChange: args.attemptedChange,
    referencedBy: {
      organizationData: args.organizationDataCount,
      carbonInventories: args.carbonInventoryCount,
    },
  });
};
