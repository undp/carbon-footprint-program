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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { GetAdminDashboardCategoryChartResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { cleanupTestSubmissions } from "@test/factories/submissionFactory.js";

describe("GET /api/admin/dashboard/category-chart - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Request validation", () => {
    it("should return 400 for an invalid year", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart?year=notanumber",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Response structure", () => {
    it("should return a methodologies array", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(Array.isArray(body.methodologies)).toBe(true);
    });

    it("should return empty methodologies when no inventories exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(body.methodologies).toHaveLength(0);
    });
  });

  describe("Methodology data", () => {
    it("should include methodology version data when ACTIVE self-declared inventories exist", async () => {
      // Find a methodology version to use
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true, name: true },
      });

      if (!methodologyVersion) {
        // Skip if no methodology version is seeded
        return;
      }

      // Create ACTIVE self-declared inventory linked to a methodology version
      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: true,
        isEditable: false,
        methodologyVersionId: methodologyVersion.id,
        createdById: testUser.id,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(body.methodologies.length).toBeGreaterThan(0);

      // Verify structure of each methodology entry
      for (const methodology of body.methodologies) {
        expect(typeof methodology.methodologyVersionId).toBe("number");
        expect(typeof methodology.methodologyVersionName).toBe("string");
        expect(Array.isArray(methodology.categoryEmissions)).toBe(true);

        for (const categoryEmission of methodology.categoryEmissions) {
          expect(typeof categoryEmission.categoryName).toBe("string");
          expect(typeof categoryEmission.totalEmissions).toBe("number");
          expect(categoryEmission.totalEmissions).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should not include inventories that are not self-declared", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      if (!methodologyVersion) {
        return;
      }

      // Create inventory with isSelfDeclared = false
      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: false,
        isEditable: false,
        methodologyVersionId: methodologyVersion.id,
        createdById: testUser.id,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(body.methodologies).toHaveLength(0);
    });
  });

  describe("Year filter", () => {
    it("should filter inventories by year when year param is provided", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      if (!methodologyVersion) {
        return;
      }

      // Create inventory for year 2023
      await createInventoryWithEmissions(prisma, {
        year: 2023,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: true,
        isEditable: false,
        methodologyVersionId: methodologyVersion.id,
        createdById: testUser.id,
      });

      // Query for year 2023 → should return data
      const responseWith2023 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart?year=2023",
      });

      expect(responseWith2023.statusCode).toBe(200);
      const bodyWith2023 = JSON.parse(
        responseWith2023.body
      ) as GetAdminDashboardCategoryChartResponse;
      expect(bodyWith2023.methodologies.length).toBeGreaterThan(0);

      // Query for year 2022 → should return empty
      const responseWith2022 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart?year=2022",
      });

      expect(responseWith2022.statusCode).toBe(200);
      const bodyWith2022 = JSON.parse(
        responseWith2022.body
      ) as GetAdminDashboardCategoryChartResponse;
      expect(bodyWith2022.methodologies).toHaveLength(0);
    });
  });
});
