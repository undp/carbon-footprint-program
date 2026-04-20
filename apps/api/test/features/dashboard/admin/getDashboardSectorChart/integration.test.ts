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
import type { GetAdminDashboardSectorChartResponse } from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  createTestOrganizationDataSubmission,
  cleanupTestSubmissions,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import {
  getTestCountryId,
  getTestMethodologyVersionId,
} from "@test/factories/methodologyFactory.js";

describe("GET /api/admin/dashboard/sector-chart - Integration Tests", () => {
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
    // Clean up test sectors (prefixed with TEST_)
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: "TEST_" } },
    });
  });

  describe("Request validation", () => {
    it("should return 400 when limit parameter is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when limit is not a positive integer", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=0",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when year is invalid", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5&year=invalid",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Response structure", () => {
    it("should return both sectorRanking and sectorEmissions arrays", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(Array.isArray(body.sectorRanking)).toBe(true);
      expect(Array.isArray(body.sectorEmissions)).toBe(true);
    });

    it("should return empty arrays when no data exists", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorRanking).toHaveLength(0);
      expect(body.sectorEmissions).toHaveLength(0);
    });
  });

  describe("Sector ranking", () => {
    it("should count approved organizations per sector (null sector when not set)", async () => {
      // Create 2 approved organizations (sector will be null since we use default factory)
      for (let i = 0; i < 2; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      // Should have 1 entry for null sector with count 2
      expect(body.sectorRanking).toHaveLength(1);
      expect(body.sectorRanking[0].sectorName).toBeNull();
      expect(body.sectorRanking[0].organizationCount).toBe(2);
    });

    it("should not include PENDING organizations in sector ranking", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorRanking).toHaveLength(0);
    });

    it("should respect the limit parameter", async () => {
      // Create 3 approved organizations - all with null sector, so only 1 entry
      // Use limit=1
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorRanking.length).toBeLessThanOrEqual(1);
    });

    it("should group organizations by real sector values", async () => {
      const countryId = await getTestCountryId(prisma);

      const sectorA = await prisma.countrySector.create({
        data: { countryId, name: "TEST_Energy", updatedAt: null },
      });
      const sectorB = await prisma.countrySector.create({
        data: { countryId, name: "TEST_Transport", updatedAt: null },
      });

      // 2 orgs in Energy
      for (let i = 0; i < 2; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          sectorId: sectorA.id,
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      // 1 org in Transport
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        sectorId: sectorB.id,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      const energyEntry = body.sectorRanking.find(
        (e) => e.sectorName === "TEST_Energy"
      );
      const transportEntry = body.sectorRanking.find(
        (e) => e.sectorName === "TEST_Transport"
      );

      expect(energyEntry).toBeDefined();
      expect(energyEntry?.organizationCount).toBe(2);
      expect(transportEntry).toBeDefined();
      expect(transportEntry?.organizationCount).toBe(1);
    });

    it("should not include APPROVED_AUTOMATICALLY organizations in sector ranking", async () => {
      // The service filters lastSubmissionStatus: APPROVED (exact match)
      // APPROVED_AUTOMATICALLY should not match
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Change to APPROVED_AUTOMATICALLY
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.APPROVED_AUTOMATICALLY },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorRanking).toHaveLength(0);
    });
  });

  describe("Year filter", () => {
    it("should filter sector ranking cumulatively (orgs approved up to year+1)", async () => {
      const currentYear = new Date().getFullYear();

      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Set reviewedAt to current year
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          reviewedAt: new Date(`${currentYear}-06-01T00:00:00.000Z`),
        },
      });

      // Query current year → should include org
      const response = await app.inject({
        method: "GET",
        url: `/api/admin/dashboard/sector-chart?limit=5&year=${currentYear}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;
      expect(body.sectorRanking).toHaveLength(1);

      // Query previous year → should NOT include org
      const prevResponse = await app.inject({
        method: "GET",
        url: `/api/admin/dashboard/sector-chart?limit=5&year=${currentYear - 1}`,
      });

      expect(prevResponse.statusCode).toBe(200);
      const prevBody = JSON.parse(
        prevResponse.body
      ) as GetAdminDashboardSectorChartResponse;
      expect(prevBody.sectorRanking).toHaveLength(0);
    });
  });

  describe("Sector ranking items", () => {
    it("should include organizationCount field in each sectorRanking entry", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      for (const entry of body.sectorRanking) {
        expect(entry).toHaveProperty("sectorName");
        expect(typeof entry.organizationCount).toBe("number");
        expect(entry.organizationCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Sector emissions", () => {
    it("should return sector emissions with correct structure and values", async () => {
      const countryId = await getTestCountryId(prisma);
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const methodologyVersion = await prisma.methodologyVersion.findFirst({
        select: {
          categories: {
            select: { position: true },
            orderBy: { position: "asc" },
          },
        },
      });

      if (!methodologyVersion) return;
      const firstPosition = methodologyVersion.categories[0].position;

      const sector = await prisma.countrySector.create({
        data: { countryId, name: "TEST_Mining", updatedAt: null },
      });

      // Create org with sector assignment
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        sectorId: sector.id,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Create inventory linked to the org with known emissions
      await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId,
          organizationId: org.id,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 7500 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=5",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorEmissions.length).toBeGreaterThan(0);

      const miningEntry = body.sectorEmissions.find(
        (e) => e.sectorName === "TEST_Mining"
      );
      expect(miningEntry).toBeDefined();
      expect(typeof miningEntry?.totalEmissions).toBe("number");
      expect(miningEntry?.totalEmissions).toBe(7500);
    });
  });

  describe("Sorting and limits", () => {
    it("should include all tied entries at the cutoff position", async () => {
      const countryId = await getTestCountryId(prisma);

      // Create 3 sectors, each with 1 approved org (all tied at count=1)
      for (const name of ["TEST_A", "TEST_B", "TEST_C"]) {
        const sector = await prisma.countrySector.create({
          data: { countryId, name, updatedAt: null },
        });
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          sectorId: sector.id,
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      // With limit=1, all 3 should still be returned because they're tied
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      // All 3 sectors tied at count=1 should be included
      const testSectors = body.sectorRanking.filter((e) =>
        e.sectorName?.startsWith("TEST_")
      );
      expect(testSectors).toHaveLength(3);
    });

    it("should sort sector ranking descending by count, alphabetical for ties, null last", async () => {
      const countryId = await getTestCountryId(prisma);

      const sectorZebra = await prisma.countrySector.create({
        data: { countryId, name: "TEST_Zebra", updatedAt: null },
      });
      const sectorAlpha = await prisma.countrySector.create({
        data: { countryId, name: "TEST_Alpha", updatedAt: null },
      });

      // 3 orgs in Zebra
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          sectorId: sectorZebra.id,
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      // 1 org in Alpha
      const alphaOrg = await createTestOrganization(prisma);
      const alphaData = await createTestOrganizationData(prisma, alphaOrg.id, {
        sectorId: sectorAlpha.id,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        alphaData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // 1 org with null sector
      const nullOrg = await createTestOrganization(prisma);
      const nullData = await createTestOrganizationData(prisma, nullOrg.id);
      await createTestOrganizationDataSubmission(
        prisma,
        nullData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/sector-chart?limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAdminDashboardSectorChartResponse;

      expect(body.sectorRanking.length).toBeGreaterThanOrEqual(3);

      // Zebra (count=3) first, then Alpha and null tied at count=1
      // For ties: alphabetical, null last
      expect(body.sectorRanking[0].sectorName).toBe("TEST_Zebra");
      expect(body.sectorRanking[0].organizationCount).toBe(3);

      // Among the tied entries (count=1), Alpha should come before null
      const tiedEntries = body.sectorRanking.filter(
        (e) => e.organizationCount === 1
      );
      const alphaIndex = tiedEntries.findIndex(
        (e) => e.sectorName === "TEST_Alpha"
      );
      const nullIndex = tiedEntries.findIndex((e) => e.sectorName === null);
      expect(alphaIndex).toBeLessThan(nullIndex);
    });
  });
});
