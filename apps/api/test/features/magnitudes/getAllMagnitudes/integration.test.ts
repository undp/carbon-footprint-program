import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { MagnitudeStatus, SystemRole } from "@repo/database";
import type { GetAllMagnitudesResponse } from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/magnitudes - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let originalRole: SystemRole;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.ADMIN },
    });
  });

  afterAll(async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: originalRole },
    });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.magnitude.deleteMany({
      where: { code: { startsWith: "test_" } },
    });
  });

  describe("Authorization", () => {
    it("should return 403 for non-admin users", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      try {
        const response = await app.inject({
          method: "GET",
          url: "/api/magnitudes",
        });
        expect(response.statusCode).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: SystemRole.ADMIN },
        });
      }
    });

    it("should return 200 for SUPERADMIN users", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });
      try {
        const response = await app.inject({
          method: "GET",
          url: "/api/magnitudes",
        });
        expect(response.statusCode).toBe(200);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: SystemRole.ADMIN },
        });
      }
    });
  });

  describe("Successful retrieval", () => {
    it("should return only ACTIVE magnitudes", async () => {
      const inactive = await prisma.magnitude.create({
        data: {
          code: "test_inactive",
          name: "Inactive Test",
          isSystem: false,
          status: MagnitudeStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/magnitudes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMagnitudesResponse;

      expect(body.every((m) => m.status === MagnitudeStatus.ACTIVE)).toBe(true);
      expect(body.some((m) => m.id === inactive.id.toString())).toBe(false);
    });

    it("should include all ten seeded system magnitudes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/magnitudes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMagnitudesResponse;
      const systemCodes = body
        .filter((m) => m.isSystem)
        .map((m) => m.code)
        .sort();

      expect(systemCodes).toEqual(
        [
          "animals",
          "area",
          "distance",
          "distance_mass",
          "energy",
          "mass",
          "power",
          "rooms",
          "time",
          "volume",
        ].sort()
      );
    });

    it("should pin system magnitudes first then sort by name ascending", async () => {
      await prisma.magnitude.create({
        data: {
          code: "test_aaa",
          name: "AAA Custom",
          isSystem: false,
          status: MagnitudeStatus.ACTIVE,
        },
      });
      await prisma.magnitude.create({
        data: {
          code: "test_zzz",
          name: "ZZZ Custom",
          isSystem: false,
          status: MagnitudeStatus.ACTIVE,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/magnitudes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMagnitudesResponse;

      const systemBlock = body.filter((m) => m.isSystem);
      const customBlock = body.filter((m) => !m.isSystem);

      expect(systemBlock.length).toBeGreaterThan(0);
      expect(customBlock.length).toBeGreaterThan(0);

      // System block precedes custom block: the last system row comes before
      // the first custom row in the response order.
      const lastSystemId = systemBlock[systemBlock.length - 1].id;
      const lastSystemIndex = body.findIndex((m) => m.id === lastSystemId);
      const firstCustomIndex = body.findIndex((m) => !m.isSystem);
      expect(lastSystemIndex).toBeLessThan(firstCustomIndex);

      // Within the custom block, names sort ascending.
      const customNames = customBlock.map((m) => m.name);
      const sortedCustomNames = [...customNames].sort((a, b) =>
        a.localeCompare(b)
      );
      expect(customNames).toEqual(sortedCustomNames);
    });

    it("should include referenceCount on every row", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/magnitudes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMagnitudesResponse;

      for (const row of body) {
        expect(typeof row.referenceCount).toBe("number");
        expect(row.referenceCount).toBeGreaterThanOrEqual(0);
      }

      // `mass` is the magnitude of the seeded MU `kg` (and others), so its
      // referenceCount must be > 0.
      const mass = body.find((m) => m.code === "mass");
      expect(mass).toBeDefined();
      expect(mass!.referenceCount).toBeGreaterThan(0);
    });

    it("should report referenceCount = 0 for a brand new custom magnitude", async () => {
      const created = await prisma.magnitude.create({
        data: {
          code: "test_unused",
          name: "Unused Test",
          isSystem: false,
          status: MagnitudeStatus.ACTIVE,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/magnitudes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMagnitudesResponse;
      const row = body.find((m) => m.id === created.id.toString());
      expect(row).toBeDefined();
      expect(row!.referenceCount).toBe(0);
    });
  });
});
