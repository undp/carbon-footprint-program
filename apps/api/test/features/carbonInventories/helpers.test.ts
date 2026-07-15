import { describe, it, expect, vi } from "vitest";
import {
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  resolveCarbonInventoryEditAccess,
  calculateEarnedRecognitions,
  calculateDisplayStatus,
  fetchInventory,
  fetchCategoryData,
  resolveInventoryOrganizationDataReferences,
  type CarbonInventoryWithSubmissionsMinimal,
  type InventoryBase,
} from "@/features/carbonInventories/helpers.js";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "@/features/carbonInventories/errors.js";
import { DataIntegrityError } from "@/errors/index.js";

describe("resolveCarbonInventoryEditAccess", () => {
  const editableInventory = {
    createdById: 1n,
    organizationId: null,
    status: CarbonInventoryDisplayStatusEnum.DRAFT,
  };

  it("returns false when the display status is not editable", () => {
    expect(
      resolveCarbonInventoryEditAccess(
        {
          ...editableInventory,
          status: CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION,
        },
        1n,
        []
      )
    ).toBe(false);
  });

  it("grants edit access for anonymous-via-uuid grants (userId === null)", () => {
    expect(resolveCarbonInventoryEditAccess(editableInventory, null, [])).toBe(
      true
    );
  });

  it("grants edit access to the creator of a standalone (no-organization) inventory", () => {
    expect(resolveCarbonInventoryEditAccess(editableInventory, 1n, [])).toBe(
      true
    );
  });

  it("denies edit access to a non-creator of a standalone inventory", () => {
    expect(resolveCarbonInventoryEditAccess(editableInventory, 2n, [])).toBe(
      false
    );
  });

  it("denies edit access for an org inventory when there is no membership", () => {
    expect(
      resolveCarbonInventoryEditAccess(
        { ...editableInventory, organizationId: 10n },
        1n,
        []
      )
    ).toBe(false);
  });

  it("grants edit access for an org inventory when the membership role is CONTRIBUTOR", () => {
    expect(
      resolveCarbonInventoryEditAccess(
        { ...editableInventory, organizationId: 10n },
        1n,
        [{ role: OrganizationRole.CONTRIBUTOR }]
      )
    ).toBe(true);
  });

  it("denies edit access for an org inventory when the membership role is VIEWER", () => {
    expect(
      resolveCarbonInventoryEditAccess(
        { ...editableInventory, organizationId: 10n },
        1n,
        [{ role: OrganizationRole.VIEWER }]
      )
    ).toBe(false);
  });
});

describe("calculateEarnedRecognitions", () => {
  const base: CarbonInventoryWithSubmissionsMinimal = {
    id: 1n,
    isSelfDeclared: false,
    submission: null,
  };

  it("returns [] when there is no submission subject", () => {
    expect(calculateEarnedRecognitions(base)).toEqual([]);
  });

  it("excludes a submission whose type is not a recognition type match", () => {
    const inventory: CarbonInventoryWithSubmissionsMinimal = {
      ...base,
      submission: {
        subject: {
          submissions: [
            {
              id: 1n,
              type: SubmissionType.ORGANIZATION_ACCREDITATION,
              status: SubmissionStatus.APPROVED,
            },
          ],
        },
      },
    };
    expect(calculateEarnedRecognitions(inventory)).toEqual([]);
  });

  it("excludes a matching-type submission whose status is neither APPROVED nor APPROVED_AUTOMATICALLY", () => {
    const inventory: CarbonInventoryWithSubmissionsMinimal = {
      ...base,
      submission: {
        subject: {
          submissions: [
            {
              id: 1n,
              type: SubmissionType.CARBON_INVENTORY_CALCULATION,
              status: SubmissionStatus.REJECTED,
            },
          ],
        },
      },
    };
    expect(calculateEarnedRecognitions(inventory)).toEqual([]);
  });

  it("includes a recognition earned via APPROVED status", () => {
    const inventory: CarbonInventoryWithSubmissionsMinimal = {
      ...base,
      submission: {
        subject: {
          submissions: [
            {
              id: 1n,
              type: SubmissionType.CARBON_INVENTORY_CALCULATION,
              status: SubmissionStatus.APPROVED,
            },
          ],
        },
      },
    };
    expect(calculateEarnedRecognitions(inventory)).toEqual([
      SubmissionType.CARBON_INVENTORY_CALCULATION,
    ]);
  });

  it("includes a recognition earned via APPROVED_AUTOMATICALLY status", () => {
    const inventory: CarbonInventoryWithSubmissionsMinimal = {
      ...base,
      submission: {
        subject: {
          submissions: [
            {
              id: 1n,
              type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
              status: SubmissionStatus.APPROVED_AUTOMATICALLY,
            },
          ],
        },
      },
    };
    expect(calculateEarnedRecognitions(inventory)).toEqual([
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
    ]);
  });
});

describe("calculateDisplayStatus", () => {
  const base: CarbonInventoryWithSubmissionsMinimal = {
    id: 1n,
    isSelfDeclared: false,
    submission: null,
  };

  const withSubmissions = (
    submissions: { type: SubmissionType; status: SubmissionStatus }[],
    isSelfDeclared = false
  ): CarbonInventoryWithSubmissionsMinimal => ({
    ...base,
    isSelfDeclared,
    submission: {
      subject: {
        submissions: submissions.map((s, index) => ({
          id: BigInt(index + 1),
          ...s,
        })),
      },
    },
  });

  it("returns DRAFT when there are no submissions and not self-declared", () => {
    expect(calculateDisplayStatus(base)).toBe(
      CarbonInventoryDisplayStatusEnum.DRAFT
    );
  });

  it("returns SELF_DECLARED when there are no submissions but isSelfDeclared is true", () => {
    expect(calculateDisplayStatus({ ...base, isSelfDeclared: true })).toBe(
      CarbonInventoryDisplayStatusEnum.SELF_DECLARED
    );
  });

  it("returns VERIFICATION_APPROVED when a verification submission is APPROVED", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: SubmissionStatus.APPROVED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED
    );
  });

  it("returns SUBMITTED_TO_VERIFICATION when a verification submission is PENDING", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: SubmissionStatus.PENDING,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION
    );
  });

  it("returns SUBMITTED_TO_CALCULATION when a calculation submission is PENDING", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: SubmissionStatus.PENDING,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION
    );
  });

  it("returns VERIFICATION_REVIEWED when a verification submission is REVIEWED", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: SubmissionStatus.REVIEWED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED
    );
  });

  it("returns CALCULATION_REVIEWED when a calculation submission is REVIEWED (no verification submission)", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: SubmissionStatus.REVIEWED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED
    );
  });

  it("returns VERIFICATION_REJECTED when a verification submission is REJECTED", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: SubmissionStatus.REJECTED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED
    );
  });

  it("returns CALCULATION_REJECTED when a calculation submission is REJECTED (no verification submission)", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: SubmissionStatus.REJECTED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED
    );
  });

  it("returns VERIFICATION_APPROVED via the APPROVED_AUTOMATICALLY fallback check", () => {
    // Synthetic: a verification submission whose status is
    // APPROVED_AUTOMATICALLY. In practice verification submissions are never
    // auto-approved, but the function still special-cases this combination —
    // exercised directly here since no real business flow produces it.
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: SubmissionStatus.APPROVED_AUTOMATICALLY,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED
    );
  });

  it("returns CALCULATION_APPROVED when a calculation submission is APPROVED (no verification submission)", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: SubmissionStatus.APPROVED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED
    );
  });

  it("returns SELF_DECLARED when a calculation submission is APPROVED_AUTOMATICALLY", () => {
    const inventory = withSubmissions([
      {
        type: SubmissionType.CARBON_INVENTORY_CALCULATION,
        status: SubmissionStatus.APPROVED_AUTOMATICALLY,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.SELF_DECLARED
    );
  });

  it("falls through to DRAFT when submissions exist but match none of the special cases", () => {
    // A submission type outside verification/calculation (e.g. an
    // organization accreditation) does not influence carbon-inventory status.
    const inventory = withSubmissions([
      {
        type: SubmissionType.ORGANIZATION_ACCREDITATION,
        status: SubmissionStatus.APPROVED,
      },
    ]);
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.DRAFT
    );
  });

  it("falls through to SELF_DECLARED when submissions exist, match none of the special cases, and isSelfDeclared is true", () => {
    const inventory = withSubmissions(
      [
        {
          type: SubmissionType.ORGANIZATION_ACCREDITATION,
          status: SubmissionStatus.APPROVED,
        },
      ],
      true
    );
    expect(calculateDisplayStatus(inventory)).toBe(
      CarbonInventoryDisplayStatusEnum.SELF_DECLARED
    );
  });
});

describe("fetchInventory", () => {
  const buildPrisma = (findUniqueResult: InventoryBase | null): PrismaClient =>
    ({
      carbonInventory: {
        findUnique: vi.fn().mockResolvedValue(findUniqueResult),
      },
    }) as unknown as PrismaClient;

  it("throws CarbonInventoryNotFoundError when no inventory row is found", async () => {
    const prisma = buildPrisma(null);
    await expect(fetchInventory(prisma, "999")).rejects.toThrow(
      CarbonInventoryNotFoundError
    );
  });

  it("throws MethodologyNotFoundError when the inventory has no methodologyVersionId", async () => {
    const prisma = buildPrisma({
      id: 1n,
      name: null,
      organizationData: null,
      methodologyVersionId: null as unknown as bigint,
      organization: null,
    });
    await expect(fetchInventory(prisma, "1")).rejects.toThrow(
      MethodologyNotFoundError
    );
  });

  it("returns the inventory when found and it has a methodologyVersionId", async () => {
    const inventory: InventoryBase = {
      id: 1n,
      name: "My inventory",
      organizationData: null,
      methodologyVersionId: 5n,
      organization: null,
    };
    const prisma = buildPrisma(inventory);
    await expect(fetchInventory(prisma, "1")).resolves.toEqual(inventory);
  });
});

describe("fetchCategoryData", () => {
  const inventory: InventoryBase = {
    id: 1n,
    name: null,
    organizationData: null,
    methodologyVersionId: 5n,
    organization: null,
  };

  it("throws MethodologyNotFoundError when the methodology version is not found", async () => {
    const prisma = {
      methodologyVersion: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      carbonInventorySubtotalsView: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;

    await expect(fetchCategoryData(prisma, inventory)).rejects.toThrow(
      MethodologyNotFoundError
    );
  });
});

describe("resolveInventoryOrganizationDataReferences", () => {
  it("throws DataIntegrityError when rawOrganizationData does not match the expected shape", async () => {
    const prisma = {} as unknown as PrismaClient;
    await expect(
      resolveInventoryOrganizationDataReferences(prisma, { not: "valid" })
    ).rejects.toThrow(DataIntegrityError);
  });

  it("returns all-null references when rawOrganizationData is null", async () => {
    const prisma = {} as unknown as PrismaClient;
    await expect(
      resolveInventoryOrganizationDataReferences(prisma, null)
    ).resolves.toEqual({
      sector: null,
      subsector: null,
      size: null,
      mainActivity: null,
    });
  });

  it("resolves each catalog reference when the corresponding *Id is set and the row is found", async () => {
    const prisma = {
      countrySector: {
        findUnique: vi.fn().mockResolvedValue({ id: 10n, name: "Sector A" }),
      },
      countrySubsector: {
        findUnique: vi.fn().mockResolvedValue({ id: 20n, name: "Subsector A" }),
      },
      countryOrganizationSize: {
        findUnique: vi.fn().mockResolvedValue({ id: 30n, name: "Size A" }),
      },
      organizationMainActivity: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 40n, name: "Main Activity A" }),
      },
    } as unknown as PrismaClient;

    await expect(
      resolveInventoryOrganizationDataReferences(prisma, {
        name: "Org",
        sectorId: "10",
        subsectorId: "20",
        sizeId: "30",
        mainActivityId: "40",
        mainActivityQuantity: null,
      })
    ).resolves.toEqual({
      sector: { id: "10", name: "Sector A" },
      subsector: { id: "20", name: "Subsector A" },
      size: { id: "30", name: "Size A" },
      mainActivity: { id: "40", name: "Main Activity A" },
    });
  });

  it("leaves each catalog reference null when the corresponding *Id is absent", async () => {
    const sectorFindUnique = vi.fn();
    const subsectorFindUnique = vi.fn();
    const sizeFindUnique = vi.fn();
    const mainActivityFindUnique = vi.fn();
    const prisma = {
      countrySector: { findUnique: sectorFindUnique },
      countrySubsector: { findUnique: subsectorFindUnique },
      countryOrganizationSize: { findUnique: sizeFindUnique },
      organizationMainActivity: { findUnique: mainActivityFindUnique },
    } as unknown as PrismaClient;

    await expect(
      resolveInventoryOrganizationDataReferences(prisma, {
        name: "Org",
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: null,
        mainActivityQuantity: null,
      })
    ).resolves.toEqual({
      sector: null,
      subsector: null,
      size: null,
      mainActivity: null,
    });

    expect(sectorFindUnique).not.toHaveBeenCalled();
    expect(subsectorFindUnique).not.toHaveBeenCalled();
    expect(sizeFindUnique).not.toHaveBeenCalled();
    expect(mainActivityFindUnique).not.toHaveBeenCalled();
  });

  it("leaves a catalog reference null when the *Id is set but the row is not found", async () => {
    const prisma = {
      countrySector: { findUnique: vi.fn().mockResolvedValue(null) },
      countrySubsector: { findUnique: vi.fn().mockResolvedValue(null) },
      countryOrganizationSize: { findUnique: vi.fn().mockResolvedValue(null) },
      organizationMainActivity: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    await expect(
      resolveInventoryOrganizationDataReferences(prisma, {
        name: "Org",
        sectorId: "999",
        subsectorId: "999",
        sizeId: "999",
        mainActivityId: "999",
        mainActivityQuantity: null,
      })
    ).resolves.toEqual({
      sector: null,
      subsector: null,
      size: null,
      mainActivity: null,
    });
  });
});
