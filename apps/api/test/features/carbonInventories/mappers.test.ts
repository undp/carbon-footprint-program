import { describe, it, expect } from "vitest";
import type { CarbonInventory as PrismaCarbonInventory } from "@repo/database";
import { UsageMode } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";
import {
  mapCarbonInventoryToResponse,
  mapLineToResponse,
  type LineWithInputs,
} from "@/features/carbonInventories/mappers.js";

/** Minimal base fields shared by every constructed fake inventory row. */
const baseInventory = {
  id: 1n,
  uuid: "11111111-1111-1111-1111-111111111111",
  name: null,
  organizationId: null,
  organizationBranchId: null,
  year: 2024,
  status: "ACTIVE",
  usageMode: UsageMode.SIMPLIFIED,
  methodologyVersionId: 5n,
  preselectedNodesId: null,
  isEditable: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  selfDeclaredAt: null,
  createdById: null,
  updatedById: null,
  selfDeclaredById: null,
  isSelfDeclared: false,
};

describe("mapCarbonInventoryToResponse (mapBaseCarbonInventory)", () => {
  it("throws DataIntegrityError when organizationData does not match the expected shape", () => {
    const item = {
      ...baseInventory,
      organizationData: { unexpectedField: "oops" },
    } as unknown as PrismaCarbonInventory;

    expect(() => mapCarbonInventoryToResponse(item)).toThrow(
      DataIntegrityError
    );
  });

  it("maps a fully-populated inventory, resolving methodologyVersionId and createdById to strings", () => {
    const item = {
      ...baseInventory,
      organizationData: null,
      methodologyVersionId: 42n,
      createdById: 7n,
      updatedById: 8n,
    } as unknown as PrismaCarbonInventory;

    const result = mapCarbonInventoryToResponse(item);

    expect(result.methodologyVersionId).toBe("42");
    expect(result.createdById).toBe("7");
    expect(result.updatedById).toBe("8");
  });

  it("falls back to null for methodologyVersionId when it is absent", () => {
    // Real DB data never allows this (the column is non-nullable), but the
    // mapper defensively falls back to null via `?.toString() ?? null` — an
    // otherwise-unreachable branch we exercise directly here.
    const item = {
      ...baseInventory,
      organizationData: null,
      methodologyVersionId: null,
    } as unknown as PrismaCarbonInventory;

    const result = mapCarbonInventoryToResponse(item);
    expect(result.methodologyVersionId).toBeNull();
  });

  it("falls back to null for createdById when it is absent", () => {
    const item = {
      ...baseInventory,
      organizationData: null,
      createdById: null,
    } as unknown as PrismaCarbonInventory;

    const result = mapCarbonInventoryToResponse(item);
    expect(result.createdById).toBeNull();
  });
});

describe("mapLineToResponse", () => {
  const baseLine = {
    id: 100n,
    subcategoryId: 200n,
    inputs: [],
  };

  it("defaults files to [] when the line's files relation is absent", () => {
    // `files` is always an array via the real Prisma `include`, so this
    // fallback (`line.files ?? []`) is otherwise unreachable through real
    // queries — exercise it directly by omitting the field entirely.
    const line = { ...baseLine } as unknown as LineWithInputs;
    // Sanity-check the constructed fixture really omits `files`.
    expect("files" in line).toBe(false);

    const result = mapLineToResponse(line);
    expect(result.files).toEqual([]);
  });

  it("filters out non-ACTIVE files and maps ACTIVE ones", () => {
    const line = {
      ...baseLine,
      files: [
        {
          file: {
            id: 1n,
            uuid: "file-uuid-active",
            originalName: "active.pdf",
            sizeBytes: 100,
            status: "ACTIVE",
          },
        },
        {
          file: {
            id: 2n,
            uuid: "file-uuid-deleted",
            originalName: "deleted.pdf",
            sizeBytes: 200,
            status: "DELETED",
          },
        },
      ],
    } as unknown as LineWithInputs;

    const result = mapLineToResponse(line);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].uuid).toBe("file-uuid-active");
  });
});
