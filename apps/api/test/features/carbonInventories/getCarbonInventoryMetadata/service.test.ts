import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@repo/database";
import { getCarbonInventoryMetadataService } from "@/features/carbonInventories/getCarbonInventoryMetadata/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("getCarbonInventoryMetadataService", () => {
  it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    await expect(
      getCarbonInventoryMetadataService(prisma, "999")
    ).rejects.toThrow(CarbonInventoryNotFoundError);
  });

  it("skips the methodology/country lookup and returns a null country when methodologyVersionId is absent", async () => {
    // Real DB data never allows this (the column is non-nullable), but the
    // service defensively falls back when it is falsy — an otherwise
    // unreachable branch we exercise directly here via a mocked client.
    const methodologyFindUnique = vi.fn();
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1n,
          name: "Inventory without methodology",
          year: 2024,
          organizationData: null,
          methodologyVersionId: null,
          organization: null,
          isSelfDeclared: false,
          submission: null,
        }),
      },
      countrySector: { findUnique: vi.fn() },
      countrySubsector: { findUnique: vi.fn() },
      countryOrganizationSize: { findUnique: vi.fn() },
      organizationMainActivity: { findUnique: vi.fn() },
      methodologyVersion: { findUnique: methodologyFindUnique },
    } as unknown as PrismaClient;

    const result = await getCarbonInventoryMetadataService(prisma, "1");

    expect(result.country).toBeNull();
    expect(methodologyFindUnique).not.toHaveBeenCalled();
  });
});
