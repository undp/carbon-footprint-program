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
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, Prisma, CountrySectorStatus } from "@repo/database";
import type { UpdateCountrySectorResponse } from "@repo/types";
import { updateCountrySectorService } from "@/features/countrySectors/admin/updateCountrySector/service.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminSecUpd ";

describe("PATCH /api/admin/country-sectors/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Orgs (and their organization_data) hold an FK to the sector via sectorId, so
    // they must be cleared before the sector rows below.
    await cleanupTestOrganization(prisma);
    // Carbon inventories carry the sector only inside their organizationData JSON
    // snapshot (no FK), so they never block the delete below — but they must still
    // be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  describe("Successful updates", () => {
    it("updates only the name (partial update)", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Old"),
        description: "old desc",
      });
      const newName = uniqueName("New");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.name).toBe(newName);
      expect(body.description).toBe("old desc");
    });

    it("description tri-state: explicit null clears it", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc"),
        description: "some text",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: null },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBeNull();
    });

    it("description tri-state: empty string clears it", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc2"),
        description: "abc",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: "" },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBeNull();
    });

    it("description tri-state: omitted leaves the description untouched", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc3"),
        description: "preserved",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: uniqueName("OnlyName") },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBe("preserved");
    });
  });

  describe("Validation errors", () => {
    it("returns 400 when the body is empty", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("EmptyBody"),
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Conflict and not-found", () => {
    it("returns 404 when sector id does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/country-sectors/9999999999",
        payload: { name: uniqueName("Whatever") },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 409 when renaming into an existing ACTIVE name", async () => {
      const taken = uniqueName("Taken");
      await createTestCountrySector(prisma, { name: taken });
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Other"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: taken },
      });
      expect(response.statusCode).toBe(409);
    });

    it("does not block renaming into a name only used by a DELETED sector", async () => {
      const ghost = uniqueName("Ghost");
      await createTestCountrySector(prisma, {
        name: ghost,
        status: CountrySectorStatus.DELETED,
      });
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Live"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: ghost },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Rename blocked by user data", () => {
    it("blocks rename (409) when an organization profile references the sector", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Old"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          sectorId: sector.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: {
          attemptedChange?: string;
          referencedBy?: { organizationData?: number };
        };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.attemptedChange).toBe("name");
      expect(body.details?.referencedBy?.organizationData).toBe(1);

      const reloaded = await prisma.countrySector.findUnique({
        where: { id: sector.id },
      });
      expect(reloaded!.name).toBe(sector.name);
    });

    it("blocks rename (409) when an ACTIVE carbon inventory snapshot references the sector", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Old"),
      });
      // The sector is referenced ONLY inside the inventory's frozen JSON snapshot —
      // no live organization_data row points at it — so this is exactly the gap the
      // FK-based count misses.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          sectorId: sector.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: {
          attemptedChange?: string;
          referencedBy?: { carbonInventories?: number };
        };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.attemptedChange).toBe("name");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);
    });

    it("does NOT block rename when only a DELETED carbon inventory snapshot references the sector", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Old"),
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          sectorId: sector.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const newName = uniqueName("New");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.name).toBe(newName);
    });

    it("allows a description-only edit even when the sector is in use", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Named"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          sectorId: sector.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: "Nueva descripción" },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Editing a soft-deleted row", () => {
    it("returns 404 when renaming a DELETED sector still referenced by user data", async () => {
      // A DELETED row can still carry user-data references (the cascade never
      // rewrites organization_data), so this is the case that used to surface as a
      // misleading 409 instead of not-found.
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Dead"),
        status: CountrySectorStatus.DELETED,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          sectorId: sector.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("No-op rename", () => {
    it("allows PATCHing name to its current value even when referenced by user data (no-op, skips the consumer check)", async () => {
      const name = uniqueName("SameName");
      const sector = await createTestCountrySector(prisma, { name });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          sectorId: sector.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.name).toBe(name);
    });
  });

  describe("Update on a soft-deleted row without a rename (P2025 surfaced by the write itself)", () => {
    it("returns 404 when description-only editing a DELETED sector (no name field to trigger the earlier existence check)", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("DeletedDescOnly"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: "New description" },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("NoUser"),
      });
      await expect(
        updateCountrySectorService(
          prisma,
          sector.id.toString(),
          { description: "x" },
          null
        )
      ).rejects.toThrow();
    });

    // The only unique constraint on `country_sector` is the partial (countryId,
    // name) index, so a real P2002 from this table's update() always carries
    // "name" in its duplicated fields, and the only relation `connect` performed
    // here (updater) surfaces as P2025 -- never another code. Both the "not a
    // P2002" and the "P2002 without name" branches in the catch block are
    // therefore defensive-only; a minimal stub standing in for the single write
    // call exercises them in isolation, without touching the real DB.
    it("rethrows a non-P2025/non-P2002 database error unchanged", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            countrySector: {
              update: () => {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Simulated foreign key violation",
                  { code: "P2003", clientVersion: "test" }
                );
              },
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        updateCountrySectorService(
          stubPrisma,
          "1",
          { description: "x" },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rethrows a P2002 unchanged when the duplicated fields do not include name", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            countrySector: {
              update: () => {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Unique constraint failed on the fields: (`other_field`)",
                  {
                    code: "P2002",
                    clientVersion: "test",
                    meta: { target: ["other_field"] },
                  }
                );
              },
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        updateCountrySectorService(
          stubPrisma,
          "1",
          { description: "x" },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
