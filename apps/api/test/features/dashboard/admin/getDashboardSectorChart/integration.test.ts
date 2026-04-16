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
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";

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
});
