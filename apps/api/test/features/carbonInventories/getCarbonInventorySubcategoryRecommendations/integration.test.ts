import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import {
  type GetSubcategoryRecommendationsResponse,
  SubcategoryRecommendationModeEnum,
  SubcategoryRecommendationStatus,
  SystemParameterKeyEnum,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

describe("GET /api/carbon-inventories/:id/subcategory-recommendations - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let sectorId: bigint;
  let subsectorId: bigint;
  let otherSectorId: bigint;
  let subcategoryId: bigint;
  let otherSubcategoryId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Use seeded CountrySector records (there are 17 seeded sectors)
    const sectors = await prisma.countrySector.findMany({
      take: 2,
      include: { subsectors: { take: 1 } },
    });

    if (sectors.length < 2) {
      throw new Error("Expected at least 2 seeded CountrySector records");
    }

    sectorId = sectors[0].id;
    otherSectorId = sectors[1].id;

    const subsector = sectors[0].subsectors[0];
    if (!subsector) {
      throw new Error(
        "Expected at least 1 CountrySubsector for the first sector"
      );
    }
    subsectorId = subsector.id;

    // Get real subcategory IDs from the seeded methodology
    const methodologyVersionId = await getTestMethodologyVersionId(prisma);
    const subcategoryIds = await getSubcategoryIds(
      prisma,
      BigInt(methodologyVersionId)
    );

    if (subcategoryIds.length < 2) {
      throw new Error(
        "Expected at least 2 subcategories in the test methodology"
      );
    }

    subcategoryId = subcategoryIds[0];
    otherSubcategoryId = subcategoryIds[1];
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clear seeded subcategory recommendations so each test starts clean
    await prisma.subcategoryRecommendation.deleteMany({});
  });

  afterEach(async () => {
    await prisma.subcategoryRecommendation.deleteMany({});
    await cleanupCarbonInventoryTestData(prisma);
    // Restore system parameter to default UNION mode after each test
    await prisma.systemParameter.update({
      where: { key: SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE },
      data: { value: SubcategoryRecommendationModeEnum.UNION },
    });
  });

  describe("Successful retrieval", () => {
    it("should return subcategory IDs in UNION mode with matching sector and subsector", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
    });

    it("should include recommendations with null subsector in UNION mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: otherSubcategoryId,
          sectorId,
          subsectorId: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
      expect(body).toContain(otherSubcategoryId.toString());
    });

    it("should exclude recommendations for a different sector in UNION mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: otherSubcategoryId,
          sectorId: otherSectorId,
          subsectorId: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).not.toContain(otherSubcategoryId.toString());
    });

    it("should return only exact sector+subsector match in SPECIFIC mode", async () => {
      await prisma.systemParameter.update({
        where: {
          key: SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE,
        },
        data: { value: SubcategoryRecommendationModeEnum.SPECIFIC },
      });

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: otherSubcategoryId,
          sectorId,
          subsectorId: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
      expect(body).not.toContain(otherSubcategoryId.toString());
    });

    it("should fall back to (sectorId, null) recommendations when SPECIFIC mode finds no exact subsector match", async () => {
      await prisma.systemParameter.update({
        where: {
          key: SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE,
        },
        data: { value: SubcategoryRecommendationModeEnum.SPECIFIC },
      });

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      // Only a null-subsector recommendation exists, no exact match —
      // SPECIFIC mode falls back to the general recommendations.
      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId: null },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
    });

    it("should deduplicate subcategory IDs when the same subcategory appears in multiple recommendations", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      // Same subcategoryId appears with subsectorId and with null subsector
      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId },
      });
      await prisma.subcategoryRecommendation.create({
        data: { subcategoryId, sectorId, subsectorId: null },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      const occurrences = body.filter((id) => id === subcategoryId.toString());
      expect(occurrences).toHaveLength(1);
    });
  });

  describe("Empty results", () => {
    it("should return empty subcategoryIds when organizationData has no sectorId", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "No Sector Corp",
            sectorId: null,
            subsectorId: null,
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toHaveLength(0);
    });

    it("should return empty subcategoryIds when organizationData is null", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toHaveLength(0);
    });

    it("should return empty subcategoryIds when no recommendations exist for the sector", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toHaveLength(0);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for non-existent inventory ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/subcategory-recommendations",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/invalid-id/subcategory-recommendations",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Soft-delete filtering", () => {
    it("excludes DELETED rows in SPECIFIC mode", async () => {
      await prisma.systemParameter.update({
        where: {
          key: SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE,
        },
        data: { value: SubcategoryRecommendationModeEnum.SPECIFIC },
      });

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId,
          sectorId,
          subsectorId,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: otherSubcategoryId,
          sectorId,
          subsectorId,
          status: SubcategoryRecommendationStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
      expect(body).not.toContain(otherSubcategoryId.toString());
    });

    it("excludes DELETED rows in UNION mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData,
        {
          organizationData: {
            name: "Test Corp",
            sectorId: sectorId.toString(),
            subsectorId: subsectorId.toString(),
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        }
      );

      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId,
          sectorId,
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: otherSubcategoryId,
          sectorId,
          subsectorId: null,
          status: SubcategoryRecommendationStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategory-recommendations`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSubcategoryRecommendationsResponse;
      expect(body).toContain(subcategoryId.toString());
      expect(body).not.toContain(otherSubcategoryId.toString());
    });
  });
});
