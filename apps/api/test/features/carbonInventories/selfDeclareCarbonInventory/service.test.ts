import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { selfDeclareCarbonInventoryService } from "@/features/carbonInventories/selfDeclareCarbonInventory/service.js";
import {
  CarbonInventoryNotFoundForSelfDeclareError,
  CarbonInventoryNotActiveForSelfDeclareError,
} from "@/features/carbonInventories/selfDeclareCarbonInventory/errors.js";

/** Builds a fake PrismaClient whose $transaction just invokes the callback with `tx`. */
const buildPrisma = (tx: Record<string, unknown>): PrismaClient =>
  ({
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(tx)),
  }) as unknown as PrismaClient;

describe("selfDeclareCarbonInventoryService", () => {
  it("claims the inventory with a null selfDeclaredById/updatedById when no user is provided", async () => {
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = buildPrisma({
      carbonInventory: {
        updateMany: updateManyMock,
        findUnique: vi.fn().mockResolvedValue({
          id: 1n,
          isSelfDeclared: true,
          submission: null,
          status: "ACTIVE",
          organizationId: null,
          year: null,
        }),
      },
      systemParameter: {
        findUnique: vi.fn().mockResolvedValue({ value: "MANUAL" }),
      },
    });

    await selfDeclareCarbonInventoryService(prisma, "1", null);

    const [claimArg] = updateManyMock.mock.calls[0] as [
      { data: { selfDeclaredById: bigint | null; updatedById: bigint | null } },
    ];
    expect(claimArg.data.selfDeclaredById).toBeNull();
    expect(claimArg.data.updatedById).toBeNull();
  });

  it("claims the inventory with the provided user's id as selfDeclaredById/updatedById", async () => {
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = buildPrisma({
      carbonInventory: {
        updateMany: updateManyMock,
        findUnique: vi.fn().mockResolvedValue({
          id: 1n,
          isSelfDeclared: true,
          submission: null,
          status: "ACTIVE",
          organizationId: null,
          year: null,
        }),
      },
      systemParameter: {
        findUnique: vi.fn().mockResolvedValue({ value: "MANUAL" }),
      },
    });

    const user = { id: "42" } as User;
    await selfDeclareCarbonInventoryService(prisma, "1", user);

    const [claimArg] = updateManyMock.mock.calls[0] as [
      { data: { selfDeclaredById: bigint | null; updatedById: bigint | null } },
    ];
    expect(claimArg.data.selfDeclaredById).toBe(42n);
    expect(claimArg.data.updatedById).toBe(42n);
  });

  it("throws CarbonInventoryNotFoundForSelfDeclareError when the inventory disappears between the atomic claim and the lookup", async () => {
    const prisma = buildPrisma({
      carbonInventory: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      selfDeclareCarbonInventoryService(prisma, "1", null)
    ).rejects.toThrow(CarbonInventoryNotFoundForSelfDeclareError);
  });

  it("throws CarbonInventoryNotActiveForSelfDeclareError when the inventory's status is not ACTIVE", async () => {
    // The DB enum only has ACTIVE/DELETED, and DELETED inventories are
    // already rejected with 403 by the access-check hook before the service
    // runs — so this diagnostic branch is otherwise unreachable in practice.
    // Exercise it directly via a mocked transaction client.
    const prisma = buildPrisma({
      carbonInventory: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({
          id: 1n,
          isSelfDeclared: false,
          submission: null,
          status: "DELETED",
          organizationId: 1n,
          year: 2024,
        }),
      },
    });

    await expect(
      selfDeclareCarbonInventoryService(prisma, "1", null)
    ).rejects.toThrow(CarbonInventoryNotActiveForSelfDeclareError);
  });
});
