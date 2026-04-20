import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { InventoryStatus } from "@repo/database";
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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";

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

      expect(methodologyVersion).toBeDefined();
      if (!methodologyVersion) return;

      // Create ACTIVE self-declared inventory linked to a methodology version
      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: InventoryStatus.ACTIVE,
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
          expect(typeof categoryEmission.categoryColor).toBe("string");
          expect(typeof categoryEmission.totalEmissions).toBe("number");
          expect(categoryEmission.totalEmissions).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should not include inventories that are not self-declared", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      expect(methodologyVersion).toBeDefined();
      if (!methodologyVersion) return;

      // Create inventory with isSelfDeclared = false
      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: InventoryStatus.ACTIVE,
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

    it("should not include DELETED inventories", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      if (!methodologyVersion) return;

      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: "DELETED",
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

      expect(body.methodologies).toHaveLength(0);
    });

    it("should return correct emission values aggregated by category", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: {
          id: true,
          categories: {
            select: { position: true },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!methodologyVersion) return;

      const positions = methodologyVersion.categories.map((c) => c.position);
      expect(positions.length).toBeGreaterThanOrEqual(2);

      await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId: methodologyVersion.id,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: positions[0], emissions: 500 },
            { categoryPosition: positions[1], emissions: 300 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(body.methodologies.length).toBeGreaterThan(0);
      const methodology = body.methodologies.find(
        (m) => m.methodologyVersionId === Number(methodologyVersion.id)
      );
      expect(methodology).toBeDefined();
      if (!methodology) return;

      expect(methodology.categoryEmissions[0].totalEmissions).toBe(0.5); // 500 kg = 0.5 tons
      expect(methodology.categoryEmissions[1].totalEmissions).toBe(0.3); // 300 kg = 0.3 tons
    });

    it("should aggregate emissions across multiple inventories for the same methodology", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: {
          id: true,
          categories: {
            select: { position: true },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!methodologyVersion) return;

      const firstPosition = methodologyVersion.categories[0].position;

      // Create two inventories on the same methodology
      await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId: methodologyVersion.id,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 100 },
          ],
        }
      );

      await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId: methodologyVersion.id,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 200 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      const methodology = body.methodologies.find(
        (m) => m.methodologyVersionId === Number(methodologyVersion.id)
      );
      expect(methodology).toBeDefined();
      if (!methodology) return;

      const firstCategory = methodology.categoryEmissions[0];
      expect(firstCategory.totalEmissions).toBe(0.3); // 300 kg aggregated = 0.3 tons
    });
  });

  describe("Year filter", () => {
    it("should filter inventories by year when year param is provided", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      expect(methodologyVersion).toBeDefined();
      if (!methodologyVersion) return;

      // Create inventory for year 2023
      await createInventoryWithEmissions(prisma, {
        year: 2023,
        usageMode: "EXPERT",
        status: InventoryStatus.ACTIVE,
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

  describe("Multiple methodologies", () => {
    it("should return entries for multiple methodology versions with inventories", async () => {
      const seededMethodology = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      if (!seededMethodology) return;

      // Create inventory on seeded methodology
      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: true,
        isEditable: false,
        methodologyVersionId: seededMethodology.id,
        createdById: testUser.id,
      });

      // Create a second methodology and a bare inventory on it
      const emptyMethodology = await createEmptyMethodologyVersion(prisma);
      await prisma.carbonInventory.create({
        data: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId: emptyMethodology.id,
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      const ids = body.methodologies.map((m) => m.methodologyVersionId);
      expect(ids).toContain(Number(seededMethodology.id));
      expect(ids).toContain(Number(emptyMethodology.id));
    });
  });

  describe("Ordering", () => {
    it("should return methodologies ordered by creation date descending", async () => {
      const seededMethodology = await prisma.methodologyVersion.findFirst({
        select: { id: true },
      });

      if (!seededMethodology) return;

      await createInventoryWithEmissions(prisma, {
        year: 2024,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: true,
        isEditable: false,
        methodologyVersionId: seededMethodology.id,
        createdById: testUser.id,
      });

      // Newer methodology created after seeded one
      const newerMethodology = await createEmptyMethodologyVersion(prisma);
      await prisma.carbonInventory.create({
        data: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId: newerMethodology.id,
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/category-chart",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardCategoryChartResponse;

      expect(body.methodologies.length).toBeGreaterThanOrEqual(2);
      // Newer methodology should come first
      expect(body.methodologies[0].methodologyVersionId).toBe(
        Number(newerMethodology.id)
      );
    });

    it("should return category emissions ordered by category position", async () => {
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: {
          id: true,
          categories: {
            select: { name: true, position: true },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!methodologyVersion) return;
      if (methodologyVersion.categories.length < 2) return;

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

      const methodology = body.methodologies.find(
        (m) => m.methodologyVersionId === Number(methodologyVersion.id)
      );
      expect(methodology).toBeDefined();
      if (!methodology) return;

      // Category names should match the position-ordered names from the DB
      const expectedNames = methodologyVersion.categories.map((c) => c.name);
      const actualNames = methodology.categoryEmissions.map(
        (ce) => ce.categoryName
      );
      expect(actualNames).toEqual(expectedNames);
    });
  });
});
