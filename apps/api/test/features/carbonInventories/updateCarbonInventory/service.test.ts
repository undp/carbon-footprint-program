import { describe, it, expect, vi } from "vitest";
import { Prisma, type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { updateCarbonInventoryService } from "@/features/carbonInventories/updateCarbonInventory/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

const editableInventory = {
  id: 1n,
  isSelfDeclared: false,
  submission: null,
  organizationId: null,
  organizationData: null,
};

describe("updateCarbonInventoryService", () => {
  it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    await expect(
      updateCarbonInventoryService(prisma, "999", { year: 2024 }, null)
    ).rejects.toThrow(CarbonInventoryNotFoundError);
  });

  it("sets updatedById to null when no user is provided", async () => {
    const updateMock = vi.fn().mockResolvedValue({
      ...editableInventory,
      uuid: "11111111-1111-1111-1111-111111111111",
      name: null,
      organizationBranchId: null,
      year: 2024,
      usageMode: "SIMPLIFIED",
      methodologyVersionId: 5n,
      preselectedNodesId: null,
      isEditable: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      selfDeclaredAt: null,
      selfDeclaredById: null,
      updatedById: null,
      organizationData: null,
    });
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(editableInventory),
        update: updateMock,
      },
      countrySector: { findUnique: vi.fn() },
      countrySubsector: { findUnique: vi.fn() },
      countryOrganizationSize: { findUnique: vi.fn() },
      organizationMainActivity: { findUnique: vi.fn() },
    } as unknown as PrismaClient;

    await updateCarbonInventoryService(prisma, "1", { year: 2024 }, null);

    const [updateArg] = updateMock.mock.calls[0] as [
      { data: { updatedById: bigint | null } },
    ];
    expect(updateArg.data.updatedById).toBeNull();
  });

  it("sets updatedById from the provided user's id", async () => {
    const updateMock = vi.fn().mockResolvedValue({
      ...editableInventory,
      uuid: "11111111-1111-1111-1111-111111111111",
      name: null,
      organizationBranchId: null,
      year: 2024,
      usageMode: "SIMPLIFIED",
      methodologyVersionId: 5n,
      preselectedNodesId: null,
      isEditable: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      selfDeclaredAt: null,
      selfDeclaredById: null,
      updatedById: null,
      organizationData: null,
    });
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(editableInventory),
        update: updateMock,
      },
      countrySector: { findUnique: vi.fn() },
      countrySubsector: { findUnique: vi.fn() },
      countryOrganizationSize: { findUnique: vi.fn() },
      organizationMainActivity: { findUnique: vi.fn() },
    } as unknown as PrismaClient;

    const user = { id: "9" } as User;
    await updateCarbonInventoryService(prisma, "1", { year: 2024 }, user);

    const [updateArg] = updateMock.mock.calls[0] as [
      { data: { updatedById: bigint | null } },
    ];
    expect(updateArg.data.updatedById).toBe(9n);
  });

  it("rethrows as CarbonInventoryNotFoundError when update() fails with Prisma P2025 (record not found)", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Record to update not found.",
      { code: "P2025", clientVersion: "test" }
    );
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(editableInventory),
        update: vi.fn().mockRejectedValue(prismaError),
      },
    } as unknown as PrismaClient;

    await expect(
      updateCarbonInventoryService(prisma, "1", { year: 2024 }, null)
    ).rejects.toThrow(CarbonInventoryNotFoundError);
  });

  it("rethrows the original error when update() fails with a different Prisma error code", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed.",
      { code: "P2002", clientVersion: "test" }
    );
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(editableInventory),
        update: vi.fn().mockRejectedValue(prismaError),
      },
    } as unknown as PrismaClient;

    await expect(
      updateCarbonInventoryService(prisma, "1", { year: 2024 }, null)
    ).rejects.toThrow(prismaError);
  });

  it("rethrows a non-Prisma error unchanged", async () => {
    const genericError = new Error("boom");
    const prisma = {
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(editableInventory),
        update: vi.fn().mockRejectedValue(genericError),
      },
    } as unknown as PrismaClient;

    await expect(
      updateCarbonInventoryService(prisma, "1", { year: 2024 }, null)
    ).rejects.toThrow(genericError);
  });
});
