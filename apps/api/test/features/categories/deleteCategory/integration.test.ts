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
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import {
  CategoryStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
  SubcategoryStatus,
} from "@repo/types";

describe("DELETE /api/categories/:id - Integration Tests", () => {
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
    // Delete methodology versions first: cascades to subcategories and their
    // recommendations, so the test sectors below no longer have referrers.
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful deletion", () => {
    it("should soft-delete a category and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Category Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id);

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      const dbRecord = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(CategoryStatus.DELETED);
    });
  });

  describe("Position reordering after deletion", () => {
    it("should shift positions of subsequent categories down by 1", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Position Reorder After Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const cat1 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Pos 1",
        position: 1,
      });
      const cat2 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Pos 2",
        position: 2,
      });
      const cat3 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Pos 3",
        position: 3,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${cat2.id}`,
      });

      const [dbCat1, dbCat3] = await Promise.all([
        prisma.category.findUnique({ where: { id: cat1.id } }),
        prisma.category.findUnique({ where: { id: cat3.id } }),
      ]);

      expect(dbCat1!.position).toBe(1);
      expect(dbCat3!.position).toBe(2);
    });

    it("should not change positions of categories before the deleted one", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Position No Change Before Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const cat1 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Before 1",
        position: 1,
      });
      const cat2 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Before 2",
        position: 2,
      });
      const cat3 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat Before 3",
        position: 3,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${cat3.id}`,
      });

      const [dbCat1, dbCat2] = await Promise.all([
        prisma.category.findUnique({ where: { id: cat1.id } }),
        prisma.category.findUnique({ where: { id: cat2.id } }),
      ]);

      expect(dbCat1!.position).toBe(1);
      expect(dbCat2!.position).toBe(2);
    });

    it("should not affect categories from a different methodology version", async () => {
      const methodologyA = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Position Isolate A",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const methodologyB = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Position Isolate B",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA1 = await createTestCategory(prisma, methodologyA.id, {
        name: "Test - Isolate A1",
        position: 1,
      });
      const catA2 = await createTestCategory(prisma, methodologyA.id, {
        name: "Test - Isolate A2",
        position: 2,
      });
      const catB1 = await createTestCategory(prisma, methodologyB.id, {
        name: "Test - Isolate B1",
        position: 1,
      });
      const catB2 = await createTestCategory(prisma, methodologyB.id, {
        name: "Test - Isolate B2",
        position: 2,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${catA1.id}`,
      });

      const [dbCatA2, dbCatB1, dbCatB2] = await Promise.all([
        prisma.category.findUnique({ where: { id: catA2.id } }),
        prisma.category.findUnique({ where: { id: catB1.id } }),
        prisma.category.findUnique({ where: { id: catB2.id } }),
      ]);

      expect(dbCatA2!.position).toBe(1);
      expect(dbCatB1!.position).toBe(1);
      expect(dbCatB2!.position).toBe(2);
    });
  });

  describe("Subcategory cascade", () => {
    it("should soft-delete all subcategories when category is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Subcats Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat With Subcats",
        position: 1,
      });

      const sub1 = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub 1",
      });
      const sub2 = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub 2",
      });

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      const [dbSub1, dbSub2] = await Promise.all([
        prisma.subcategory.findUnique({ where: { id: sub1.id } }),
        prisma.subcategory.findUnique({ where: { id: sub2.id } }),
      ]);

      expect(dbSub1!.status).toBe(SubcategoryStatus.DELETED);
      expect(dbSub2!.status).toBe(SubcategoryStatus.DELETED);
    });
  });

  describe("Emission factor cascade", () => {
    it("should soft-delete all emission factors when category is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade EFs via Category",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat With EFs",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub With EFs",
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef1 = await createTestEmissionFactor(prisma, sub.id, rateUnitId);
      const ef2 = await createTestEmissionFactor(prisma, sub.id, rateUnitId);

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      const [dbEf1, dbEf2] = await Promise.all([
        prisma.emissionFactor.findUnique({ where: { id: ef1.id } }),
        prisma.emissionFactor.findUnique({ where: { id: ef2.id } }),
      ]);

      expect(dbEf1!.status).toBe(EmissionFactorStatus.DELETED);
      expect(dbEf2!.status).toBe(EmissionFactorStatus.DELETED);
    });
  });

  describe("Reduction plan initiative & recommendation cascade", () => {
    it("should soft-delete initiatives and recommendations of the category's subcategories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Initiatives via Category",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Cat With Initiatives",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub With Initiatives",
      });
      const sector = await createTestCountrySector(prisma);

      const initiative = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          title: "Test - Initiative via Category",
          description: "Test initiative description",
        },
      });
      const recommendation = await prisma.subcategoryRecommendation.create({
        data: { subcategoryId: sub.id, sectorId: sector.id },
      });

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
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
    it("should return 404 when category does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/categories/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 404 when category is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted Category",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id, {
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });
  });
});
