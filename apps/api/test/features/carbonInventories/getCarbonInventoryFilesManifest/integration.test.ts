import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  getSubcategoryIds,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestMemberships,
  createTestMembership,
} from "@test/factories/membershipFactory.js";
import {
  cleanupTestFiles,
  createTestFile,
} from "@test/factories/fileFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetCarbonInventoryFilesManifestResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  CarbonInventoryLineStatus,
  FileStatus,
  MembershipStatus,
  OrganizationRole,
  SystemRole,
  type PrismaClient,
} from "@repo/database";
import type { FastifyInstance } from "fastify";

const INVENTORY_PREFIX = (inventoryId: bigint | string) =>
  `CARBON_INVENTORY/${inventoryId.toString()}/LINES/`;

async function attachFileToLine(
  prisma: PrismaClient,
  inventoryId: bigint,
  lineId: bigint,
  userId: bigint,
  overrides: {
    originalName?: string;
    blobPath?: string;
    fileStatus?: FileStatus;
    deletedAt?: Date | null;
    mimeType?: string;
    sizeBytes?: number;
  } = {}
) {
  const blobPath =
    overrides.blobPath ??
    `${INVENTORY_PREFIX(inventoryId)}${crypto.randomUUID()}-${overrides.originalName ?? "doc.pdf"}`;
  const file = await createTestFile(prisma, userId, {
    originalName: overrides.originalName ?? "doc.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    sizeBytes: overrides.sizeBytes ?? 2048,
    blobPath,
    status: overrides.fileStatus ?? FileStatus.ACTIVE,
    deletedAt: overrides.deletedAt ?? null,
  });
  await prisma.carbonInventoryLineFile.create({
    data: { lineId, fileId: file.id, createdById: userId },
  });
  return file;
}

describe("GET /api/carbon-inventories/:id/files-manifest - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;
  let subcategoryIds: bigint[];

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
    subcategoryIds = await getSubcategoryIds(prisma, methodologyVersionId);
    expect(subcategoryIds.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.carbonInventoryLineFile.deleteMany({});
    await cleanupTestFiles(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
  });

  it("returns one entry per ACTIVE-line ACTIVE-file attachment with a signed SAS URL", async () => {
    const user = await getTestLoggedUser(prisma);
    const organization = await createTestOrganization(prisma);
    await createTestMembership(prisma, user.id, organization.id, {
      role: OrganizationRole.CONTRIBUTOR,
      status: MembershipStatus.ACTIVE,
    });

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { organizationId: organization.id, createdById: user.id }
    );
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    const lineInput = await createCarbonInventoryLineInput(prisma, line.id, {
      inputType: "DIRECT",
    });
    await createCarbonInventoryLineResult(prisma, lineInput.id, 1000);
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "invoice.pdf",
    });
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "receipt.pdf",
      mimeType: "application/pdf",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files).toHaveLength(2);
    expect(typeof body.expiresAt).toBe("string");

    for (const entry of body.files) {
      expect(entry.lineId).toBe(line.id.toString());
      expect(typeof entry.sasUrl).toBe("string");
      expect(entry.sasUrl).toMatch(/^https?:\/\//);
      expect(entry.fileUuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(entry.sizeBytes).toBe(2048);
      expect(entry.mimeType).toBe("application/pdf");
      expect(typeof entry.categoryName).toBe("string");
      expect(typeof entry.subcategoryName).toBe("string");
    }

    const names = body.files.map((f) => f.originalName).sort();
    expect(names).toEqual(["invoice.pdf", "receipt.pdf"]);
  });

  it("returns an empty list for an inventory with no attached files", async () => {
    const user = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: user.id }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files).toEqual([]);
    expect(typeof body.expiresAt).toBe("string");
  });

  it("excludes files attached to OUTDATED or DELETED lines", async () => {
    const user = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: user.id }
    );
    const activeLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    const activeInput = await createCarbonInventoryLineInput(
      prisma,
      activeLine.id,
      { inputType: "DIRECT" }
    );
    await createCarbonInventoryLineResult(prisma, activeInput.id, 1000);
    const outdatedLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0],
      { status: CarbonInventoryLineStatus.OUTDATED }
    );
    const deletedLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0],
      { status: CarbonInventoryLineStatus.DELETED }
    );

    await attachFileToLine(prisma, inventory.id, activeLine.id, user.id, {
      originalName: "kept.pdf",
    });
    await attachFileToLine(prisma, inventory.id, outdatedLine.id, user.id, {
      originalName: "outdated.pdf",
    });
    await attachFileToLine(prisma, inventory.id, deletedLine.id, user.id, {
      originalName: "deleted-line.pdf",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files.map((f) => f.originalName)).toEqual(["kept.pdf"]);
  });

  it("includes files for ACTIVE lines with an active input even without a result, but excludes lines without any active input", async () => {
    const user = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: user.id }
    );
    const completedLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    const completedInput = await createCarbonInventoryLineInput(
      prisma,
      completedLine.id,
      { inputType: "DIRECT" }
    );
    await createCarbonInventoryLineResult(prisma, completedInput.id, 1000);

    const inProgressLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    await createCarbonInventoryLineInput(prisma, inProgressLine.id, {
      inputType: "DIRECT",
    });

    const untouchedLine = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );

    await attachFileToLine(prisma, inventory.id, completedLine.id, user.id, {
      originalName: "calculated.pdf",
    });
    await attachFileToLine(prisma, inventory.id, inProgressLine.id, user.id, {
      originalName: "in-progress.pdf",
    });
    await attachFileToLine(prisma, inventory.id, untouchedLine.id, user.id, {
      originalName: "untouched.pdf",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files.map((f) => f.originalName).sort()).toEqual([
      "calculated.pdf",
      "in-progress.pdf",
    ]);
  });

  it("excludes files whose status is DELETED or that are soft-deleted", async () => {
    const user = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: user.id }
    );
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    const input = await createCarbonInventoryLineInput(prisma, line.id, {
      inputType: "DIRECT",
    });
    await createCarbonInventoryLineResult(prisma, input.id, 1000);

    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "ok.pdf",
    });
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "deleted-status.pdf",
      fileStatus: FileStatus.DELETED,
    });
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "soft-deleted.pdf",
      deletedAt: new Date(),
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files.map((f) => f.originalName)).toEqual(["ok.pdf"]);
  });

  it("skips files whose blobPath does not start with the inventory prefix", async () => {
    const user = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: user.id }
    );
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      subcategoryIds[0]
    );
    const input = await createCarbonInventoryLineInput(prisma, line.id, {
      inputType: "DIRECT",
    });
    await createCarbonInventoryLineResult(prisma, input.id, 1000);
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "valid.pdf",
    });
    // Stray path — belongs to a different inventory's LINES/ folder.
    await attachFileToLine(prisma, inventory.id, line.id, user.id, {
      originalName: "stray.pdf",
      blobPath: `CARBON_INVENTORY/999999/LINES/${crypto.randomUUID()}-stray.pdf`,
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files.map((f) => f.originalName)).toEqual(["valid.pdf"]);
  });

  it("allows anonymous calls when x-carbon-inventory-uuid matches", async () => {
    const inventory = await prisma.carbonInventory.create({
      data: {
        usageMode: "SIMPLIFIED",
        createdById: null,
        methodologyVersionId,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
      headers: { "x-carbon-inventory-uuid": inventory.uuid },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryFilesManifestResponse;
    expect(body.files).toEqual([]);
  });

  it("denies cross-organization users without admin bypass", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const originalRole = testUser.role;
    const otherCreator = await prisma.user.create({
      data: {
        email: `creator-${Date.now()}@test.example.com`,
        idpUserId: `test-idp-${Date.now()}`,
        firstName: "Other",
        lastName: "Creator",
      },
    });
    const organization = await createTestOrganization(prisma);

    try {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: otherCreator.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
      });
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("allows system admins from a different organization to read the manifest", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const originalRole = testUser.role;
    const otherCreator = await prisma.user.create({
      data: {
        email: `creator-${Date.now()}@test.example.com`,
        idpUserId: `test-idp-${Date.now()}`,
        firstName: "Other",
        lastName: "Creator",
      },
    });
    const organization = await createTestOrganization(prisma);

    try {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: otherCreator.id }
      );
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
      });
      await createCarbonInventoryLineResult(prisma, input.id, 1000);
      await attachFileToLine(prisma, inventory.id, line.id, otherCreator.id, {
        originalName: "admin-view.pdf",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/files-manifest`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryFilesManifestResponse;
      expect(body.files.map((f) => f.originalName)).toEqual(["admin-view.pdf"]);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("returns 403 when the inventory does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/carbon-inventories/999999999/files-manifest",
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as ApiErrorResponse;
    expect(body.code).toBe("FORBIDDEN");
  });
});
