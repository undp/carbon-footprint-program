import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import {
  type GetAllOrganizationMainActivitiesResponse,
  type GetAllCountrySectorsResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ApiErrorResponse,
} from "@/commonSchemas/errors.js";

describe("GET /api/organization-main-activities - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("Successful retrieval", () => {
    it("should return a non-empty array of organization main activities", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it("should return ONLY generic activities when no filter is provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;

      // All activities should be generic (no sector/subsector)
      expect(body.length).toBeGreaterThan(0);

      // Get all activities from DB to verify they are all double-NULL
      const allDbActivities = await prisma.organizationMainActivity.findMany();
      const genericInDb = allDbActivities.filter(
        (a) => a.countrySectorId === null && a.countrySubsectorId === null
      );

      // Response should match the count of generic activities in DB
      expect(body.length).toBe(genericInDb.length);

      // Check some expected generic activities
      const genericActivityNames = body.map((a) => a.name);
      expect(genericActivityNames).toContain("empleados");
      expect(genericActivityNames).toContain("clientes");
    });
  });

  describe("Ordering", () => {
    it("should return activities ordered by name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const names = body.map((a) => a.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const ids = body.map((a) => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Generic activities always included", () => {
    it("should always include generic activities in results", async () => {
      // Get generic activities count
      const genericResponse = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });
      const genericBody = JSON.parse(
        genericResponse.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const genericCount = genericBody.length;

      // Get a sector ID
      const sectorsResponse = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });
      const sectors = JSON.parse(
        sectorsResponse.body
      ) as GetAllCountrySectorsResponse;
      const testSector = sectors.find((s) => s.name === "Energía");

      expect(testSector).toBeDefined();

      // Filter by sector
      const sectorResponse = await app.inject({
        method: "GET",
        url: `/api/organization-main-activities?sectorId=${testSector!.id}`,
      });

      expect(sectorResponse.statusCode).toBe(200);
      const sectorBody = JSON.parse(
        sectorResponse.body
      ) as GetAllOrganizationMainActivitiesResponse;

      // Should include more activities than generic alone
      expect(sectorBody.length).toBeGreaterThanOrEqual(genericCount);

      // Verify generic activities are included
      const activityNames = sectorBody.map((a) => a.name);
      expect(activityNames).toContain("empleados"); // generic activity
      expect(activityNames).toContain("clientes"); // generic activity
    });
  });

  describe("Filtering by sectorId", () => {
    it("should return sector-specific activities PLUS generic activities", async () => {
      // Get generic activities count first
      const genericResponse = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });
      const genericActivities = JSON.parse(
        genericResponse.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const genericCount = genericActivities.length;

      // Get a sector ID
      const sectorsResponse = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });
      const sectors = JSON.parse(
        sectorsResponse.body
      ) as GetAllCountrySectorsResponse;
      const energiaSector = sectors.find(
        (s: { name: string }) => s.name === "Energía"
      );
      expect(energiaSector).toBeDefined();

      // Get activities from DB for this sector
      const sectorActivitiesDb = await prisma.organizationMainActivity.findMany(
        {
          where: { countrySectorId: BigInt(energiaSector!.id) },
        }
      );

      // Now filter activities by this sector
      const response = await app.inject({
        method: "GET",
        url: `/api/organization-main-activities?sectorId=${energiaSector!.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;

      // Should include generic activities + sector-specific activities
      expect(body.length).toBe(genericCount + sectorActivitiesDb.length);

      // Verify it includes both generic and sector-specific
      const activityNames = body.map((a) => a.name);
      expect(activityNames).toContain("empleados"); // generic
      expect(activityNames).toContain("MWh generados"); // Energía specific
    });

    it("should return only generic activities for non-existent sectorId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities?sectorId=999999",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;

      // Should still return generic activities
      expect(body.length).toBeGreaterThan(0);

      // All should be from DB with null sector/subsector
      const activityNames = body.map((a) => a.name);
      expect(activityNames).toContain("empleados");
    });
  });

  describe("Filtering by subsectorId (forbidden without sectorId)", () => {
    it("should return 400 when only subsectorId is provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities?subsectorId=1",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Filtering by both sectorId and subsectorId", () => {
    it("should return subsector-specific activities PLUS generic activities", async () => {
      // Get generic activities count first
      const genericResponse = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });
      const genericActivities = JSON.parse(
        genericResponse.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const genericCount = genericActivities.length;

      // Get a sector with subsectors
      const sectorsResponse = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });
      const sectors = JSON.parse(
        sectorsResponse.body
      ) as GetAllCountrySectorsResponse;
      const sectorWithSubsectors = sectors.find((s) => s.subsectors.length > 0);

      expect(sectorWithSubsectors).toBeDefined();
      const subsector = sectorWithSubsectors!.subsectors[0];
      expect(subsector).toBeDefined();

      // Get activities from DB for this sector/subsector combo with OR condition
      const subsectorActivitiesDb =
        await prisma.organizationMainActivity.findMany({
          where: {
            OR: [
              { countrySectorId: BigInt(sectorWithSubsectors!.id) },
              { countrySubsectorId: BigInt(subsector.id) },
            ],
          },
        });

      // Filter by both sector and subsector
      const response = await app.inject({
        method: "GET",
        url: `/api/organization-main-activities?sectorId=${sectorWithSubsectors!.id}&subsectorId=${subsector.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;

      // Should include generic activities + subsector-specific activities
      expect(body.length).toBe(genericCount + subsectorActivitiesDb.length);

      // Verify it includes generic activities
      const activityNames = body.map((a) => a.name);
      expect(activityNames).toContain("empleados"); // generic
    });
  });

  describe("Soft-delete filter (smoke)", () => {
    const PUBLIC_PREFIX = "Test - PublicMA ";

    afterEach(async () => {
      await prisma.organizationMainActivity.deleteMany({
        where: { name: { startsWith: PUBLIC_PREFIX } },
      });
    });

    it("excludes DELETED main activities from the public response", async () => {
      const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const active = await createTestOrganizationMainActivity(prisma, {
        name: `${PUBLIC_PREFIX}Active ${random}`,
      });
      const deleted = await createTestOrganizationMainActivity(prisma, {
        name: `${PUBLIC_PREFIX}Deleted ${random}`,
        status: OrganizationMainActivityStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllOrganizationMainActivitiesResponse;
      const ids = body.map((a) => a.id);
      expect(ids).toContain(active.id.toString());
      expect(ids).not.toContain(deleted.id.toString());
    });
  });

  describe("Query parameter validation", () => {
    it("should reject invalid sectorId format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities?sectorId=invalid",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject subsectorId without sectorId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities?subsectorId=123",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toContain(
        "subsectorId cannot be provided without sectorId"
      );
    });

    it("should accept both sectorId and subsectorId together", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/organization-main-activities?sectorId=1&subsectorId=1",
      });

      // Should not be a validation error (could be 200 or 404 depending on data)
      expect([200, 404]).toContain(response.statusCode);
    });
  });
});
