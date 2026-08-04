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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  Prisma,
  CountrySectorStatus,
  SystemRole,
} from "@repo/database";
import type { CreateCountrySectorResponse } from "@repo/types";
import { createCountrySectorService } from "@/features/countrySectors/admin/createCountrySector/service.js";
import { NoCountryFoundError } from "@/features/methodologies/errors.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminSec ";

describe("POST /api/admin/country-sectors - Integration Tests", () => {
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
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  describe("Successful creation", () => {
    it("creates a sector and returns 201 with admin shape", async () => {
      const name = uniqueName("Create");
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name, description: "A test sector" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCountrySectorResponse;
      expect(body.id).toBeTruthy();
      expect(body.name).toBe(name);
      expect(body.description).toBe("A test sector");
      expect(body.status).toBe(CountrySectorStatus.ACTIVE);
      expect(body.impactedChildren.organizationData).toBe(0);

      const dbRow = await prisma.countrySector.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRow).toBeTruthy();
      expect(dbRow!.status).toBe(CountrySectorStatus.ACTIVE);
      expect(dbRow!.createdById).toBe(testUser.id);
    });

    it("creates a sector with description=null", async () => {
      const name = uniqueName("NoDesc");
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name, description: null },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCountrySectorResponse;
      expect(body.description).toBeNull();
    });
  });

  describe("Validation errors", () => {
    it("returns 400 when name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { description: "x" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when name is whitespace-only", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name: "   " },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Unique constraint violations", () => {
    it("returns 409 when an ACTIVE sector with the same name already exists", async () => {
      const name = uniqueName("Dup");
      await createTestCountrySector(prisma, { name });

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name, description: null },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DATABASE_UNIQUE_CONSTRAINT_VIOLATION");
    });

    it("allows creating an ACTIVE sector when a DELETED sector has the same name", async () => {
      const name = uniqueName("WithDeletedTwin");
      await createTestCountrySector(prisma, {
        name,
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name, description: null },
      });
      expect(response.statusCode).toBe(201);
    });
  });

  describe("Authorization", () => {
    it("returns 403 when the caller has USER role", async () => {
      const originalRole = testUser.role;
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/admin/country-sectors/",
          payload: { name: uniqueName("Forbidden"), description: null },
        });
        expect(response.statusCode).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: originalRole },
        });
      }
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      await expect(
        createCountrySectorService(
          prisma,
          { name: uniqueName("NoUser"), description: null },
          null
        )
      ).rejects.toThrow();
    });

    it("should throw NoCountryFoundError when the database has no country", async () => {
      // The `country` table is always seeded in every real deployment; this
      // guard is a defensive check that cannot be reached through the seeded
      // test database without deleting all countries (which would cascade
      // through unrelated seeded data). A minimal stub standing in for the
      // transaction's one read call before any mutation exercises the guard
      // in isolation, without touching the real DB.
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({ country: { findFirst: () => Promise.resolve(null) } }),
      } as unknown as PrismaClient;

      await expect(
        createCountrySectorService(
          stubPrisma,
          { name: uniqueName("NoCountry"), description: null },
          mapUserToResponse(testUser)
        )
      ).rejects.toThrow(NoCountryFoundError);
    });

    it("should rethrow a non-duplicate database error unchanged (foreign key violation)", async () => {
      const bogusUser = {
        ...mapUserToResponse(testUser),
        id: "999999999999",
      };
      const name = uniqueName("FKViolation");

      await expect(
        createCountrySectorService(
          prisma,
          { name, description: null },
          bogusUser
        )
      ).rejects.toThrow();

      // Cleanup in case the row was somehow created (it should not be).
      await prisma.countrySector.deleteMany({ where: { name } });
    });

    it("rethrows a P2002 unchanged when the duplicated fields do not include name", async () => {
      // The only unique constraint on `country_sector` is the partial
      // (countryId, name) index, so a real P2002 from this table's create()
      // always carries "name" in its duplicated fields. This branch is
      // therefore defensive-only; a minimal stub exercises it in isolation.
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            country: { findFirst: () => Promise.resolve({ id: 1n }) },
            countrySector: {
              create: () => {
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

      await expect(
        createCountrySectorService(
          stubPrisma,
          { name: uniqueName("StubP2002"), description: null },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
