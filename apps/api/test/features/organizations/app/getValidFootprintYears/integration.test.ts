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
import type { GetValidFootprintYearsResponse } from "@repo/types";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";

describe("GET /api/app/organizations/:orgId/valid-footprint-years - Integration Tests", () => {
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
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Happy path", () => {
    it("should return empty array when organization has no active inventories", async () => {
      const org = await createTestOrganization(prisma);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([]);
    });

    it("should return years for active carbon inventories", async () => {
      const org = await createTestOrganization(prisma);

      await prisma.carbonInventory.create({
        data: {
          organizationId: org.id,
          usageMode: "SIMPLIFIED",
          status: "ACTIVE",
          year: 2023,
          createdById: testUser.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toContain(2023);
    });

    it("should return multiple years in descending order", async () => {
      const org = await createTestOrganization(prisma);

      await prisma.carbonInventory.createMany({
        data: [
          {
            organizationId: org.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2021,
            createdById: testUser.id,
          },
          {
            organizationId: org.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2023,
            createdById: testUser.id,
          },
          {
            organizationId: org.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2022,
            createdById: testUser.id,
          },
        ],
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([2023, 2022, 2021]);
    });

    it("should deduplicate years when multiple inventories share the same year", async () => {
      const org = await createTestOrganization(prisma);

      await prisma.carbonInventory.createMany({
        data: [
          {
            organizationId: org.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2023,
            createdById: testUser.id,
          },
          {
            organizationId: org.id,
            usageMode: "EXPERT",
            status: "ACTIVE",
            year: 2023,
            createdById: testUser.id,
          },
        ],
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([2023]);
      expect(body).toHaveLength(1);
    });

    it("should not return years for DELETED inventories", async () => {
      const org = await createTestOrganization(prisma);

      await prisma.carbonInventory.create({
        data: {
          organizationId: org.id,
          usageMode: "SIMPLIFIED",
          status: "DELETED",
          year: 2022,
          createdById: testUser.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([]);
    });

    it("should not return years for inventories with null year", async () => {
      const org = await createTestOrganization(prisma);

      await prisma.carbonInventory.create({
        data: {
          organizationId: org.id,
          usageMode: "SIMPLIFIED",
          status: "ACTIVE",
          year: null,
          createdById: testUser.id,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([]);
    });

    it("should only return years for the requested organization", async () => {
      const org1 = await createTestOrganization(prisma);
      const org2 = await createTestOrganization(prisma);

      await prisma.carbonInventory.createMany({
        data: [
          {
            organizationId: org1.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2023,
            createdById: testUser.id,
          },
          {
            organizationId: org2.id,
            usageMode: "SIMPLIFIED",
            status: "ACTIVE",
            year: 2022,
            createdById: testUser.id,
          },
        ],
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org1.id.toString()}/valid-footprint-years`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([2023]);
      expect(body).not.toContain(2022);
    });
  });

  describe("Error cases", () => {
    it("should return 400 for invalid orgId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/invalid-id/valid-footprint-years",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return empty array for non-existent organization ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/999999999/valid-footprint-years",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetValidFootprintYearsResponse;
      expect(body).toEqual([]);
    });
  });
});
