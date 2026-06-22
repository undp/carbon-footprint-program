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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import type { DeleteMethodologyResponse } from "@repo/types";
import {
  CategoryStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
  SubcategoryStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("DELETE /api/methodologies/:id - Integration Tests", () => {
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

  afterEach(async () => {
    // restoreMethodologies deletes the test versions first, cascading to their
    // subcategories and recommendations, so the test sectors below no longer
    // have referrers.
    await restoreMethodologies(prisma);
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful deletion", () => {
    it("should soft-delete an unpublished methodology and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - To Delete",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeleteMethodologyResponse;
      expect(body.message).toBe("Methodology deleted successfully");
      expect(body.id).toBe(methodology.id.toString());
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Delete",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: methodology.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.DELETED);
    });

    it("should allow deletion when methodology has only DELETED carbon inventories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - With Deleted Inventories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.simplifiedDraft(),
        status: "DELETED",
        methodologyVersionId: methodology.id,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should cascade soft-delete active categories when methodology is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Delete Categories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category1 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category To Cascade 1",
        position: 1,
      });
      const category2 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category To Cascade 2",
        position: 2,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const dbCategory1 = await prisma.category.findUnique({
        where: { id: category1.id },
      });
      const dbCategory2 = await prisma.category.findUnique({
        where: { id: category2.id },
      });

      expect(dbCategory1!.status).toBe(CategoryStatus.DELETED);
      expect(dbCategory2!.status).toBe(CategoryStatus.DELETED);
    });

    it("should cascade soft-delete subcategories when methodology is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Delete Subcategories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat For Sub Cascade",
        position: 1,
      });
      const sub1 = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub Cascade 1",
      });
      const sub2 = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub Cascade 2",
      });

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const [dbSub1, dbSub2] = await Promise.all([
        prisma.subcategory.findUnique({ where: { id: sub1.id } }),
        prisma.subcategory.findUnique({ where: { id: sub2.id } }),
      ]);

      expect(dbSub1!.status).toBe(SubcategoryStatus.DELETED);
      expect(dbSub2!.status).toBe(SubcategoryStatus.DELETED);
    });

    it("should cascade soft-delete emission factors when methodology is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Delete EFs",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat For EF Cascade",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub For EF Cascade",
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef1 = await createTestEmissionFactor(prisma, sub.id, rateUnitId);
      const ef2 = await createTestEmissionFactor(prisma, sub.id, rateUnitId);

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const [dbEf1, dbEf2] = await Promise.all([
        prisma.emissionFactor.findUnique({ where: { id: ef1.id } }),
        prisma.emissionFactor.findUnique({ where: { id: ef2.id } }),
      ]);

      expect(dbEf1!.status).toBe(EmissionFactorStatus.DELETED);
      expect(dbEf2!.status).toBe(EmissionFactorStatus.DELETED);
    });

    it("should cascade soft-delete reduction plan initiatives and subcategory recommendations", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Delete Initiatives via Methodology",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat For Initiative Cascade",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub For Initiative Cascade",
      });
      const sector = await createTestCountrySector(prisma);

      const initiative = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          title: "Test - Initiative via Methodology",
          description: "Test initiative description",
        },
      });
      const recommendation = await prisma.subcategoryRecommendation.create({
        data: { subcategoryId: sub.id, sectorId: sector.id },
      });

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const [dbInitiative, dbRecommendation] = await Promise.all([
        prisma.reductionPlanInitiative.findUnique({
          where: { id: initiative.id },
        }),
        prisma.subcategoryRecommendation.findUnique({
          where: { id: recommendation.id },
        }),
      ]);

      expect(dbInitiative!.status).toBe(ReductionPlanInitiativeStatus.DELETED);
      expect(dbRecommendation!.status).toBe(
        SubcategoryRecommendationStatus.DELETED
      );
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/methodologies/999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });

    it("should return 404 when methodology is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted",
        status: MethodologyVersionStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });

    it("should return 409 when methodology is published", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Published Cannot Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_IS_PUBLISHED");
    });

    it("should return 409 when methodology has active carbon inventories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Has Active Inventories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.simplifiedDraft(),
        methodologyVersionId: methodology.id,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_HAS_ACTIVE_INVENTORIES");
    });
  });
});
