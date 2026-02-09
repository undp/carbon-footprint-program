import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { GetAdminOrganizationsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/admin/organizations - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testCountryId: bigint;
  let testJobPositionId: bigint;
  let testSectorId: bigint;
  let testSectorName: string;
  let testSubsectorId: bigint;
  let testSubsectorName: string;
  let testSizeId: bigint;
  let testSizeName: string;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    const country = await prisma.country.findFirst();
    if (!country) throw new Error("No country found in database for testing");
    testCountryId = country.id;

    const jobPosition = await prisma.countryJobPosition.findFirst();
    if (!jobPosition)
      throw new Error("No job position found in database for testing");
    testJobPositionId = jobPosition.id;

    const sector = await prisma.countrySector.findFirst();
    if (!sector) throw new Error("No sector found in database for testing");
    testSectorId = sector.id;
    testSectorName = sector.name;

    const subsector = await prisma.countrySubsector.findFirst({
      where: { countrySectorId: testSectorId },
    });
    if (!subsector)
      throw new Error("No subsector found in database for testing");
    testSubsectorId = subsector.id;
    testSubsectorName = subsector.name;

    const orgSize = await prisma.countryOrganizationSize.findFirst();
    if (!orgSize) throw new Error("No org size found in database for testing");
    testSizeId = orgSize.id;
    testSizeName = orgSize.name;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.submission.deleteMany({
      where: {
        subject: {
          organizationData: {
            organizationData: {
              organization: {
                countryId: testCountryId,
                status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
              },
            },
          },
        },
      },
    });
    await prisma.submissionSubjectOrganizationData.deleteMany({
      where: {
        organizationData: {
          organization: {
            countryId: testCountryId,
            status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
          },
        },
      },
    });
    await prisma.submissionSubject.deleteMany({
      where: {
        organizationData: {
          organizationData: {
            organization: {
              countryId: testCountryId,
              status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
            },
          },
        },
      },
    });
    await prisma.organizationData.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.carbonInventory.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.userOrganizationMembership.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        countryId: testCountryId,
        status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
      },
    });
  });

  async function createTestOrganization(
    status: "NOT_ACCREDITED" | "ACCREDITED" | "BLOCKED" = "NOT_ACCREDITED"
  ) {
    return prisma.organization.create({
      data: {
        countryId: testCountryId,
        status,
      },
    });
  }

  async function createTestOrganizationWithData(
    options: {
      status?: "NOT_ACCREDITED" | "ACCREDITED" | "BLOCKED";
      tradeName?: string;
      legalName?: string;
      sectorId?: bigint;
      subsectorId?: bigint;
      sizeId?: bigint;
    } = {}
  ) {
    const {
      status = "NOT_ACCREDITED",
      tradeName,
      legalName = "Test Org",
      sectorId = testSectorId,
      subsectorId = testSubsectorId,
      sizeId = testSizeId,
    } = options;

    const org = await prisma.organization.create({
      data: {
        countryId: testCountryId,
        status,
      },
    });

    await prisma.organizationData.create({
      data: {
        organizationId: org.id,
        status: "COMPLETED",
        legalName,
        tradeName,
        taxId: `TAX-${org.id}`,
        sectorId,
        subsectorId,
        countryOrganizationSizeId: sizeId,
        representativeFullName: "John Doe",
        representativeTaxId: `REP-${org.id}`,
        representativeCountryJobPositionId: testJobPositionId,
        representativePhone: "+1234567890",
        representativeEmail: "rep@test.com",
      },
    });

    return org;
  }

  describe("Successful retrieval", () => {
    it("should return paginated response with correct structure", async () => {
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("limit");
      expect(body).toHaveProperty("offset");
      expect(body).toHaveProperty("totalPages");
      expect(body).toHaveProperty("hasNext");
      expect(body).toHaveProperty("hasPrev");
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("should return organizations filtered by single status", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "ACCREDITED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      for (const item of body.data) {
        expect(item.status).toBe("ACCREDITED");
      }
    });

    it("should return organizations filtered by multiple statuses", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("ACCREDITED");
      await createTestOrganization("BLOCKED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED,ACCREDITED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      for (const item of body.data) {
        expect(["NOT_ACCREDITED", "ACCREDITED"]).toContain(item.status);
      }
      // BLOCKED org should not appear
      const blockedItems = body.data.filter((i) => i.status === "BLOCKED");
      expect(blockedItems).toHaveLength(0);
    });

    it("should return organization items with populated view fields", async () => {
      await createTestOrganizationWithData({
        status: "ACCREDITED",
        tradeName: "Trade Corp",
        legalName: "Legal Corp",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "ACCREDITED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      const item = body.data.find((i) => i.name === "Trade Corp");
      expect(item).toBeDefined();
      expect(item!.sector).toBe(testSectorName);
      expect(item!.subsector).toBe(testSubsectorName);
      expect(item!.size).toBe(testSizeName);
    });
  });

  describe("Pagination", () => {
    it("should respect limit parameter", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "2" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.limit).toBe(2);
    });

    it("should respect offset parameter", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");

      const allResponse = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "10" },
      });
      const allBody = JSON.parse(
        allResponse.body
      ) as GetAdminOrganizationsResponse;

      const offsetResponse = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "10", offset: "1" },
      });
      const offsetBody = JSON.parse(
        offsetResponse.body
      ) as GetAdminOrganizationsResponse;

      expect(offsetBody.offset).toBe(1);
      expect(offsetBody.data.length).toBe(allBody.data.length - 1);
    });

    it("should return correct totalPages calculation", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "2" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.totalPages).toBe(Math.ceil(body.total / 2));
    });

    it("should return hasNext=true when more pages exist", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "1", offset: "0" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.hasNext).toBe(true);
    });

    it("should return hasPrev=true when offset > 0", async () => {
      await createTestOrganization("NOT_ACCREDITED");
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "10", offset: "1" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.hasPrev).toBe(true);
    });

    it("should return empty data when offset exceeds total", async () => {
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED", limit: "10", offset: "9999" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.data).toHaveLength(0);
      expect(body.hasNext).toBe(false);
    });
  });

  describe("Sorting", () => {
    it("should sort by name ascending by default", async () => {
      await createTestOrganizationWithData({
        status: "NOT_ACCREDITED",
        tradeName: "Zeta Corp",
      });
      await createTestOrganizationWithData({
        status: "NOT_ACCREDITED",
        tradeName: "Alpha Corp",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      const names = body.data
        .map((i) => i.name)
        .filter((n): n is string => n !== null);
      // Null names sort first in asc, then named orgs in alphabetical order
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it("should sort by name descending when sortOrder=desc", async () => {
      await createTestOrganizationWithData({
        status: "NOT_ACCREDITED",
        tradeName: "Zeta Corp",
      });
      await createTestOrganizationWithData({
        status: "NOT_ACCREDITED",
        tradeName: "Alpha Corp",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: {
          statuses: "NOT_ACCREDITED",
          sortBy: "name",
          sortOrder: "desc",
        },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      const names = body.data
        .map((i) => i.name)
        .filter((n): n is string => n !== null);
      const sortedNames = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(sortedNames);
    });
  });

  describe("Response schema", () => {
    it("should return items with all expected fields", async () => {
      await createTestOrganizationWithData({ status: "NOT_ACCREDITED" });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      expect(body.data.length).toBeGreaterThanOrEqual(1);
      const item = body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("sector");
      expect(item).toHaveProperty("subsector");
      expect(item).toHaveProperty("size");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("hasCarbonInventories");
      expect(item).toHaveProperty("lastEdition");
      expect(item).toHaveProperty("emissions");
      expect(item).toHaveProperty("awards");
      expect(typeof item.id).toBe("string");
      expect(typeof item.hasCarbonInventories).toBe("boolean");
      expect(typeof item.emissions).toBe("number");
      expect(Array.isArray(item.awards)).toBe(true);
    });

    it("should return nullable fields as null when org has no completed data", async () => {
      await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "NOT_ACCREDITED" },
      });

      const body = JSON.parse(response.body) as GetAdminOrganizationsResponse;

      const item = body.data.find((i) => i.name === null);
      expect(item).toBeDefined();
      expect(item!.name).toBeNull();
      expect(item!.sector).toBeNull();
      expect(item!.subsector).toBeNull();
      expect(item!.size).toBeNull();
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when statuses is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body).toHaveProperty("code");
      expect(body).toHaveProperty("message");
    });

    it("should return 400 when statuses contains invalid value", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
        query: { statuses: "INVALID_STATUS" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body).toHaveProperty("code");
      expect(body).toHaveProperty("message");
    });
  });
});
