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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { getEmissionFactorDimensionsService } from "@/features/emissionFactorDimensions/getEmissionFactorDimensions/service.js";
import type { GetEmissionFactorDimensionsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/emission-factor-dimensions/ - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  async function buildScenario(namePrefix: string) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${namePrefix}`,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: `Test - ${namePrefix} Category`,
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: `Test - ${namePrefix} Subcategory`,
    });
    return { methodology, category, subcategory };
  }

  describe("methodologyVersionId filtering", () => {
    it("should only return subcategories belonging to the requested methodology version", async () => {
      const { methodology: methodologyA, subcategory: subcategoryA } =
        await buildScenario("Get Dims Filter A");
      await buildScenario("Get Dims Filter B");

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factor-dimensions/?methodologyVersionId=${methodologyA.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionFactorDimensionsResponse;

      expect(body.length).toBe(1);
      expect(body[0].subcategoryId).toBe(subcategoryA.id.toString());
    });

    it("should return 400 when methodologyVersionId is not provided (required by schema)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/emission-factor-dimensions/",
      });

      // The querystring schema requires methodologyVersionId, so the
      // `query?.methodologyVersionId` false branch inside the service is
      // unreachable through the HTTP layer -- see the direct service-call
      // test below for that branch.
      expect(response.statusCode).toBe(400);
    });

    it("should return an empty array (200, not 404) when no subcategory matches the methodology version", async () => {
      const emptyMethodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Get Dims Empty Methodology",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factor-dimensions/?methodologyVersionId=${emptyMethodology.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionFactorDimensionsResponse;
      expect(body).toEqual([]);
    });

    // The route's querystring schema requires `methodologyVersionId`, so a
    // request without it never reaches the service. Call the service
    // directly (still against the real test database) to exercise the
    // `query?.methodologyVersionId` false branch (no filter applied).
    it("[direct service call] should not filter by methodology version when query is null", async () => {
      const { subcategory } = await buildScenario("Get Dims Null Query");

      const result = await getEmissionFactorDimensionsService(
        prisma,
        null,
        null
      );

      expect(
        result.some((s) => s.subcategoryId === subcategory.id.toString())
      ).toBe(true);
    });
  });

  describe("inUse computation", () => {
    it("should mark a dimension value as not in use when no emission factor references it", async () => {
      const { subcategory, methodology } = await buildScenario(
        "Get Dims Not In Use"
      );
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Unused Value",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factor-dimensions/?methodologyVersionId=${methodology.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionFactorDimensionsResponse;
      const value = body[0].dimensions[0].values[0];
      expect(value.inUse).toBe(false);
      expect(body[0].subcategoryHasEmissionFactors).toBe(false);
    });

    it("should mark a dimension value as in use when referenced as dimensionValue1", async () => {
      const { subcategory, methodology } = await buildScenario(
        "Get Dims InUse Dim1"
      );
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      const value = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "Used Dim1 Value" }
      );
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
        dimensionValue1Id: value.id,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factor-dimensions/?methodologyVersionId=${methodology.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionFactorDimensionsResponse;
      const value1 = body[0].dimensions[0].values[0];
      expect(value1.inUse).toBe(true);
      expect(body[0].subcategoryHasEmissionFactors).toBe(true);
    });

    it("should mark a dimension value as in use when referenced only as dimensionValue2", async () => {
      const { subcategory, methodology } = await buildScenario(
        "Get Dims InUse Dim2"
      );
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: false }
      );
      const value = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "Used Dim2 Value" }
      );
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
        dimensionValue2Id: value.id,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factor-dimensions/?methodologyVersionId=${methodology.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionFactorDimensionsResponse;
      const value2 = body[0].dimensions[0].values[0];
      expect(value2.inUse).toBe(true);
    });
  });
});
