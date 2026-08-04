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
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import type { UpdateCountrySubsectorResponse } from "@repo/types";
import { updateCountrySubsectorService } from "@/features/countrySubsectors/admin/updateCountrySubsector/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminSubUpd ";

describe("PATCH /api/admin/country-subsectors/:id - Integration Tests", () => {
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
    await cleanupTestOrganization(prisma);
    // Carbon inventories carry the subsector only inside their `organizationData`
    // JSON snapshot (no FK), so they never block the catalog deletes below — but
    // they must still be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    // Recommendations reference sectors/subsectors with a non-cascading FK, so
    // they must be removed before the catalog rows they point at.
    await prisma.subcategoryRecommendation.deleteMany({
      where: { sector: { name: { startsWith: TEST_PREFIX } } },
    });
    await prisma.organizationMainActivity.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySubsector.deleteMany({
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

  async function getSeededSubcategoryId(): Promise<bigint> {
    const subcategory = await prisma.subcategory.findFirst({
      select: { id: true },
    });
    if (!subcategory) {
      throw new Error(
        "No seeded subcategory found. Ensure the test database is seeded."
      );
    }
    return subcategory.id;
  }

  it("partial update of name", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
    expect(body.name).toBe(newName);
  });

  it("returns 400 when body is empty", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 409 when renaming into an existing ACTIVE name within the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const taken = uniqueName("Taken");
    await createTestCountrySubsector(prisma, parent.id, { name: taken });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Mine"),
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: taken },
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 404 when reparenting to a missing sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: "9999999999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when reparenting to a DELETED sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const ghostParent = await createTestCountrySector(prisma, {
      name: uniqueName("Ghost"),
      status: CountrySectorStatus.DELETED,
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: ghostParent.id.toString() },
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Re-parent blocked by dependents", () => {
    it("re-parents to another sector when the subsector has no dependents", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Clean"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(target.id);
    });

    it("blocks re-parent (409) when an ACTIVE main activity references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithMA"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });

    it("blocks re-parent (409) when an ACTIVE subcategory recommendation references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithRec"),
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: await getSeededSubcategoryId(),
          sectorId: parent.id,
          subsectorId: sub.id,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
    });

    it("blocks re-parent (409) when an organization profile references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithOrg"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          subsectorId: sub.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
    });

    it("blocks re-parent (409) when an ACTIVE carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithInv"),
      });
      // The subsector is referenced ONLY inside the inventory's frozen JSON
      // snapshot (stored as a string) — no live organization_data row points at
      // it — so this case is exactly the gap the FK-based counts miss.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { carbonInventories?: number } };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });

    it("does NOT block re-parent when only a DELETED carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithDeletedInv"),
      });
      // A DELETED inventory's frozen pair is inert and must not block re-parenting.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(target.id);
    });

    it("allows renaming when only a catalog child (no user data) references the subsector", async () => {
      // A main activity is a catalog child, not user data. Renaming the subsector
      // does not make any user see a wrong name, so a rename is allowed even though
      // re-parenting would be blocked by the same main activity.
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Named"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const newName = uniqueName("Renamed");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
      expect(body.name).toBe(newName);
    });

    it("does NOT block when countrySectorId equals the current parent, even with dependents (no-op)", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("SameParent"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: parent.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });
  });

  describe("Rename blocked by user data", () => {
    it("blocks rename (409) when an organization profile references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Old"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          subsectorId: sub.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
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

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.name).toBe(sub.name);
    });

    it("blocks rename (409) when an ACTIVE carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Old"),
      });
      // The subsector is referenced ONLY inside the inventory's frozen JSON
      // snapshot — exactly the gap the FK-based counts miss.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
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

    it("does NOT block rename when only a DELETED carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Old"),
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const newName = uniqueName("New");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
      expect(body.name).toBe(newName);
    });

    it("allows a description-only edit even when the subsector is in use", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Named"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          subsectorId: sub.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { description: "Nueva descripción" },
      });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Editing a soft-deleted row", () => {
    it("returns 404 when renaming a DELETED subsector still referenced by user data", async () => {
      // A DELETED row can still carry user-data references (the cascade never
      // rewrites organization_data), so this is the case that used to surface as a
      // misleading 409 instead of not-found.
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Dead"),
        status: CountrySubsectorStatus.DELETED,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          subsectorId: sub.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when description-only editing a DELETED subsector (no name/parent field to trigger the earlier existence check)", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("DeletedDescOnly"),
        status: CountrySubsectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { description: "New description" },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("NoUserParent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("NoUser"),
      });
      await expect(
        updateCountrySubsectorService(
          prisma,
          sub.id.toString(),
          { description: "x" },
          null
        )
      ).rejects.toThrow();
    });

    // The only unique constraint on `country_subsector` is the partial
    // (countrySectorId, name) index, so a real P2002 from this table's
    // update() always carries "name" in its duplicated fields, and the only
    // relation `connect` performed unconditionally here (updater) surfaces as
    // P2025 -- never another code. Both the "not a P2002" and the "P2002
    // without name" branches in the catch block are therefore defensive-only;
    // a minimal stub standing in for the single write call exercises them in
    // isolation, without touching the real DB.
    it("rethrows a non-P2025/non-P2002 database error unchanged", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            countrySubsector: {
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
        updateCountrySubsectorService(
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
            countrySubsector: {
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
        updateCountrySubsectorService(
          stubPrisma,
          "1",
          { description: "x" },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
