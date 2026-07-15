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
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import { uploadFixture } from "@test/factories/storageHelper.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import type { CarbonInventory, PrismaClient, User } from "@repo/database";
import {
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES,
  CARBON_INVENTORY_LINE_MAX_FILE_SIZE_BYTES,
} from "@repo/constants";
import type { ConfirmLineFileUploadResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

// Exercises the carbon-inventory line-file confirm-upload flow end to end
// (real DB + real object storage) — the only path that covers
// confirmLineFileUploadService: the allowed-mime-type guard, the max-size
// guard (both of which delete the just-uploaded blob on rejection), and the
// File row persistence with createdById set from the authenticated caller.
// The forced test user is SUPERADMIN and is set as the inventory's creator,
// so the standalone-inventory "creator has access" rule is satisfied without
// needing an organization/membership.

const lineBlobPath = (
  inventoryId: bigint | string,
  uuid: string,
  originalName: string
): string =>
  `CARBON_INVENTORY/${inventoryId.toString()}/LINES/${uuid}-${originalName}`;

describe("POST /api/carbon-inventories/:id/files/confirm-upload - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupCarbonInventoryTestData(prisma);
  });

  async function seedInventory(): Promise<CarbonInventory> {
    return createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: testUser.id }
    );
  }

  describe("Happy path", () => {
    it("persists the File row scoped to the inventory's LINES/ blob path", async () => {
      const inventory = await seedInventory();
      const uuid = "660e8400-e29b-41d4-a716-446655440001";
      const originalName = "invoice.pdf";
      const blobPath = lineBlobPath(inventory.id, uuid, originalName);
      await uploadFixture(app.storage, blobPath, {
        contentType: "application/pdf",
        content: "small pdf content",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/files/confirm-upload`,
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as ConfirmLineFileUploadResponse;
      expect(body.uuid).toBe(uuid);
      expect(body.originalName).toBe(originalName);
      expect(body.sizeBytes).toBeGreaterThan(0);

      const file = await prisma.file.findUnique({ where: { uuid } });
      expect(file).not.toBeNull();
      expect(file?.blobPath).toBe(blobPath);
      expect(file?.mimeType).toBe("application/pdf");
      expect(file?.createdById).toBe(testUser.id);
    });
  });

  describe("Error cases", () => {
    it("rejects a disallowed mime type with 422 and deletes the blob", async () => {
      const inventory = await seedInventory();
      const uuid = "660e8400-e29b-41d4-a716-446655440002";
      const originalName = "malware.exe";
      const blobPath = lineBlobPath(inventory.id, uuid, originalName);
      const disallowedMimeType = "application/x-msdownload";
      expect(
        CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES as readonly string[]
      ).not.toContain(disallowedMimeType);
      await uploadFixture(app.storage, blobPath, {
        contentType: disallowedMimeType,
        content: "not really an exe",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/files/confirm-upload`,
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(422);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "LINE_FILE_UPLOAD_VALIDATION_ERROR"
      );
      await expect(app.storage.headObject(blobPath)).rejects.toThrow();
      expect(await prisma.file.findUnique({ where: { uuid } })).toBeNull();
    });

    it("rejects an oversize upload with 422 and deletes the blob", async () => {
      const inventory = await seedInventory();
      const uuid = "660e8400-e29b-41d4-a716-446655440003";
      const originalName = "huge.csv";
      const blobPath = lineBlobPath(inventory.id, uuid, originalName);
      const oversizeContent = "a".repeat(
        CARBON_INVENTORY_LINE_MAX_FILE_SIZE_BYTES + 100
      );
      await uploadFixture(app.storage, blobPath, {
        contentType: "text/csv",
        content: oversizeContent,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/files/confirm-upload`,
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(422);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "LINE_FILE_UPLOAD_VALIDATION_ERROR"
      );
      await expect(app.storage.headObject(blobPath)).rejects.toThrow();
      expect(await prisma.file.findUnique({ where: { uuid } })).toBeNull();
    }, 30_000);

    it("returns 404 when the blob does not exist", async () => {
      const inventory = await seedInventory();
      const uuid = "660e8400-e29b-41d4-a716-446655440004";

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/files/confirm-upload`,
        payload: { uuid, originalName: "ghost.pdf" },
      });

      expect(response.statusCode).toBe(404);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_NOT_FOUND"
      );
    });
  });

  // Note: the `createdById: userId ? BigInt(userId) : null` null branch (an
  // anonymous, unauthenticated caller) is not exercised here. Under
  // AUTH_PROVIDER=forced-user every request that reaches the handler carries
  // an authenticated `currentUser` (the anonymous-via-header path in
  // `requireCarbonInventoryAccess` still requires `request.authUser` to be
  // absent, which the forced-user provider does not produce) — unreachable
  // under this auth provider.
});
