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
import {
  cleanupTestFiles,
  createTestFile,
} from "@test/factories/fileFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  FileStatus,
  type CarbonInventory,
  type PrismaClient,
  type User,
} from "@repo/database";
import { randomUUID } from "crypto";
import type { DeleteLineFileResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

// deleteLineFileService only touches Prisma (no storage access — the blob is
// left in place and only the File row is soft-deleted), so this app is built
// WITHOUT a storage descriptor. Covers the file-not-found/not-ACTIVE guard
// and the cross-inventory blob-path-prefix guard. The forced test user is
// SUPERADMIN and is set as the inventory's creator, so the
// standalone-inventory "creator has access" rule is satisfied without
// needing an organization/membership.

const linePrefix = (inventoryId: bigint | string): string =>
  `CARBON_INVENTORY/${inventoryId.toString()}/LINES/`;

describe("DELETE /api/carbon-inventories/:id/files/:uuid - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
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

  it("soft-deletes an ACTIVE file scoped to the inventory", async () => {
    const inventory = await seedInventory();
    const uuid = randomUUID();
    const file = await createTestFile(prisma, testUser.id, {
      uuid,
      originalName: "invoice.pdf",
      blobPath: `${linePrefix(inventory.id)}${uuid}-invoice.pdf`,
      status: FileStatus.ACTIVE,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/carbon-inventories/${inventory.id}/files/${file.uuid}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as DeleteLineFileResponse;
    expect(body.uuid).toBe(uuid);

    const updated = await prisma.file.findUnique({ where: { uuid } });
    expect(updated?.status).toBe(FileStatus.DELETED);
    expect(updated?.deletedAt).not.toBeNull();
  });

  it("returns 404 for an unknown file uuid", async () => {
    const inventory = await seedInventory();
    const unknownUuid = randomUUID();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/carbon-inventories/${inventory.id}/files/${unknownUuid}`,
    });

    expect(response.statusCode).toBe(404);
    expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
      "FILE_NOT_FOUND"
    );
  });

  it("returns 404 for a file whose status is already DELETED", async () => {
    const inventory = await seedInventory();
    const uuid = randomUUID();
    const file = await createTestFile(prisma, testUser.id, {
      uuid,
      originalName: "already-gone.pdf",
      blobPath: `${linePrefix(inventory.id)}${uuid}-already-gone.pdf`,
      status: FileStatus.DELETED,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/carbon-inventories/${inventory.id}/files/${file.uuid}`,
    });

    expect(response.statusCode).toBe(404);
    expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
      "FILE_NOT_FOUND"
    );
  });

  it("returns the cross-inventory error when the file's blob path belongs to a different inventory", async () => {
    const inventory = await seedInventory();
    const otherInventory = await seedInventory();
    const uuid = randomUUID();
    const file = await createTestFile(prisma, testUser.id, {
      uuid,
      originalName: "stray.pdf",
      blobPath: `${linePrefix(otherInventory.id)}${uuid}-stray.pdf`,
      status: FileStatus.ACTIVE,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/carbon-inventories/${inventory.id}/files/${file.uuid}`,
    });

    expect(response.statusCode).toBe(422);
    expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
      "CROSS_INVENTORY_FILE_LINKING"
    );

    // The file must remain untouched — the guard runs before the update.
    const untouched = await prisma.file.findUnique({ where: { uuid } });
    expect(untouched?.status).toBe(FileStatus.ACTIVE);
  });
});
