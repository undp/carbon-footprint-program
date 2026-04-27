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
  CountrySectorStatus,
  SystemRole,
} from "@repo/database";
import type { CreateCountrySectorResponse } from "@repo/types";

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
      expect(body.isInUse).toBe(false);

      const dbRow = await prisma.countrySector.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRow).toBeTruthy();
      expect(dbRow!.status).toBe(CountrySectorStatus.ACTIVE);
      expect(dbRow!.createdById).toBe(testUser.id);
    });

    it("creates a sector with no description (omitted)", async () => {
      const name = uniqueName("NoDesc");
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-sectors/",
        payload: { name },
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
        payload: { name },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("DATABASE_UNIQUE_CONSTRAINT_VIOLATION");
      expect(body.message).toContain("rubro");
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
        payload: { name },
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
          payload: { name: uniqueName("Forbidden") },
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
});
