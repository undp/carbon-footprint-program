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
import type { GetAdminDashboardKpisResponse } from "@repo/types";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  createTestOrganizationDataSubmission,
  createTestCarbonInventorySubmission,
  cleanupTestSubmissions,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

describe("GET /api/admin/dashboard/kpis - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
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

  describe("Response structure", () => {
    it("should return all 6 KPI fields with correct types", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;

      expect(typeof body.totalOrganizations).toBe("number");
      expect(typeof body.measuringOrganizations).toBe("number");
      expect(typeof body.totalEmissions).toBe("number");
      expect(typeof body.verifiedEmissions).toBe("number");
      expect(typeof body.recognitionsEarned).toBe("number");
      expect(typeof body.recognitionsUnderReview).toBe("number");
    });

    it("should return zeros when no data exists", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;

      expect(body.totalOrganizations).toBe(0);
      expect(body.measuringOrganizations).toBe(0);
      expect(body.totalEmissions).toBe(0);
      expect(body.verifiedEmissions).toBe(0);
      expect(body.recognitionsEarned).toBe(0);
      expect(body.recognitionsUnderReview).toBe(0);
    });
  });

  describe("totalOrganizations", () => {
    it("should count distinct organizations with approved accreditation", async () => {
      // Create 2 approved organizations
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
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.totalOrganizations).toBe(2);
    });

    it("should not count organizations with only PENDING accreditation", async () => {
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
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.totalOrganizations).toBe(0);
    });

    it("should count organizations with APPROVED_AUTOMATICALLY accreditation", async () => {
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
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.totalOrganizations).toBe(1);
    });
  });

  describe("recognitionsEarned", () => {
    it("should count approved carbon inventory submissions across all recognition types", async () => {
      // Create a carbon inventory and link it to recognition submissions
      const inventory = await prisma.carbonInventory.create({
        data: {
          methodologyVersionId,
          year: 2024,
          status: "ACTIVE",
          isSelfDeclared: true,
          usageMode: "SIMPLIFIED",
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      // Create APPROVED CARBON_INVENTORY_CALCULATION submission
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.recognitionsEarned).toBe(1);
    });

    it("should count APPROVED_AUTOMATICALLY carbon inventory submissions as earned", async () => {
      const inventory = await prisma.carbonInventory.create({
        data: {
          methodologyVersionId,
          year: 2024,
          status: "ACTIVE",
          isSelfDeclared: true,
          usageMode: "SIMPLIFIED",
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      const { submission } = await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
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
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.recognitionsEarned).toBe(1);
    });

    it("should not count PENDING carbon inventory submissions as earned", async () => {
      const inventory = await prisma.carbonInventory.create({
        data: {
          methodologyVersionId,
          year: 2024,
          status: "ACTIVE",
          isSelfDeclared: true,
          usageMode: "SIMPLIFIED",
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.recognitionsEarned).toBe(0);
    });
  });

  describe("recognitionsUnderReview", () => {
    it("should count PENDING carbon inventory submissions as under review", async () => {
      const inventory = await prisma.carbonInventory.create({
        data: {
          methodologyVersionId,
          year: 2024,
          status: "ACTIVE",
          isSelfDeclared: true,
          usageMode: "SIMPLIFIED",
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.recognitionsUnderReview).toBe(1);
    });
  });

  describe("measuringOrganizations", () => {
    it("should count accredited organizations with active self-declared inventories", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Create accredited org
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Create ACTIVE self-declared inventory linked to the org
      const currentYear = new Date().getFullYear();
      await createInventoryWithEmissions(prisma, {
        year: currentYear,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: true,
        isEditable: false,
        methodologyVersionId,
        organizationId: org.id,
        createdById: testUser.id,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.measuringOrganizations).toBe(1);
    });

    it("should not count accredited organizations without self-declared inventories", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Create inventory that is NOT self-declared
      const currentYear = new Date().getFullYear();
      await createInventoryWithEmissions(prisma, {
        year: currentYear,
        usageMode: "EXPERT",
        status: "ACTIVE",
        isSelfDeclared: false,
        isEditable: false,
        methodologyVersionId,
        organizationId: org.id,
        createdById: testUser.id,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.measuringOrganizations).toBe(0);
    });
  });

  describe("totalEmissions", () => {
    it("should sum emissions from all active self-declared inventories", async () => {
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
      const positions = methodologyVersion.categories.map((c) => c.position);

      await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: positions[0], emissions: 1000 },
            { categoryPosition: positions[1], emissions: 2000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.totalEmissions).toBe(3); // 1000 + 2000 = 3000 kg = 3 tons
    });
  });

  describe("verifiedEmissions", () => {
    it("should sum emissions from inventories with approved verification", async () => {
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

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 5000 },
          ],
        }
      );

      // Create APPROVED verification submission
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.verifiedEmissions).toBe(5); // 5000 kg = 5 tons
    });

    it("should not count emissions from inventories with only pending verification", async () => {
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

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          year: 2024,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 5000 },
          ],
        }
      );

      // Create PENDING verification submission
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.verifiedEmissions).toBe(0);
    });
  });

  describe("Year filter", () => {
    it("should return 400 for an invalid year", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis?year=abc",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should filter totalOrganizations cumulatively up to the given year", async () => {
      const currentYear = new Date().getFullYear();

      // Create org approved this year
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

      // Query for current year should include this org
      const response = await app.inject({
        method: "GET",
        url: `/api/admin/dashboard/kpis?year=${currentYear}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminDashboardKpisResponse;
      expect(body.totalOrganizations).toBe(1);

      // Query for previous year should NOT include this org
      const prevResponse = await app.inject({
        method: "GET",
        url: `/api/admin/dashboard/kpis?year=${currentYear - 1}`,
      });

      expect(prevResponse.statusCode).toBe(200);
      const prevBody = JSON.parse(
        prevResponse.body
      ) as GetAdminDashboardKpisResponse;
      expect(prevBody.totalOrganizations).toBe(0);
    });

    it("should filter totalEmissions by inventory year", async () => {
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

      await createInventoryWithEmissions(
        prisma,
        {
          year: 2023,
          usageMode: "EXPERT",
          status: "ACTIVE",
          isSelfDeclared: true,
          isEditable: false,
          methodologyVersionId,
          createdById: testUser.id,
        },
        {
          emissionsByCategory: [
            { categoryPosition: firstPosition, emissions: 1000 },
          ],
        }
      );

      // Year 2023 should include emissions
      const response2023 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis?year=2023",
      });

      expect(response2023.statusCode).toBe(200);
      const body2023 = JSON.parse(
        response2023.body
      ) as GetAdminDashboardKpisResponse;
      expect(body2023.totalEmissions).toBe(1); // 1000 kg = 1 ton

      // Year 2022 should have no emissions
      const response2022 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis?year=2022",
      });

      expect(response2022.statusCode).toBe(200);
      const body2022 = JSON.parse(
        response2022.body
      ) as GetAdminDashboardKpisResponse;
      expect(body2022.totalEmissions).toBe(0);
    });

    it("should filter recognitionsEarned by carbon inventory year", async () => {
      const inventory = await prisma.carbonInventory.create({
        data: {
          methodologyVersionId,
          year: 2023,
          status: "ACTIVE",
          isSelfDeclared: true,
          usageMode: "SIMPLIFIED",
          createdById: testUser.id,
          updatedAt: null,
        },
      });

      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Year 2023 should include recognition
      const response2023 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis?year=2023",
      });

      expect(response2023.statusCode).toBe(200);
      const body2023 = JSON.parse(
        response2023.body
      ) as GetAdminDashboardKpisResponse;
      expect(body2023.recognitionsEarned).toBe(1);

      // Year 2022 should have no recognitions
      const response2022 = await app.inject({
        method: "GET",
        url: "/api/admin/dashboard/kpis?year=2022",
      });

      expect(response2022.statusCode).toBe(200);
      const body2022 = JSON.parse(
        response2022.body
      ) as GetAdminDashboardKpisResponse;
      expect(body2022.recognitionsEarned).toBe(0);
    });
  });
});
