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
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import {
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
  SubcategoryStatus,
} from "@repo/types";

describe("DELETE /api/subcategories/:id - Integration Tests", () => {
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
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
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
    it("should soft-delete a subcategory and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategory Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Delete Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Subcategory Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Verify Delete Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);

      await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      const dbRecord = await prisma.subcategory.findUnique({
        where: { id: subcategory.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(SubcategoryStatus.DELETED);
    });
  });

  describe("Emission factor cascade", () => {
    it("should soft-delete associated emission factors when subcategory is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade EFs Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - EF Cascade Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef1 = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId
      );
      const ef2 = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId
      );

      await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
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
    it("should soft-delete associated initiatives and recommendations when subcategory is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Cascade Initiatives Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Initiative Cascade Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);
      const sector = await createTestCountrySector(prisma);

      const initiative = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subcategory.id,
          title: "Test - Initiative",
          description: "Test initiative description",
        },
      });
      const recommendation = await prisma.subcategoryRecommendation.create({
        data: { subcategoryId: subcategory.id, sectorId: sector.id },
      });

      await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
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

    it("should not affect initiatives or recommendations of other subcategories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Initiative Cascade Isolation",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Initiative Isolation Parent",
        position: 1,
      });
      const target = await createTestSubcategory(prisma, category.id, {
        name: "Test - Target Sub",
      });
      const sibling = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sibling Sub",
      });
      const sector = await createTestCountrySector(prisma);

      const siblingInitiative = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sibling.id,
          title: "Test - Sibling Initiative",
          description: "Untouched initiative",
        },
      });
      const siblingRecommendation =
        await prisma.subcategoryRecommendation.create({
          data: { subcategoryId: sibling.id, sectorId: sector.id },
        });

      await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${target.id}`,
      });

      const [dbInitiative, dbRecommendation] = await Promise.all([
        prisma.reductionPlanInitiative.findUnique({
          where: { id: siblingInitiative.id },
        }),
        prisma.subcategoryRecommendation.findUnique({
          where: { id: siblingRecommendation.id },
        }),
      ]);

      expect(dbInitiative!.status).toBe(ReductionPlanInitiativeStatus.ACTIVE);
      expect(dbRecommendation!.status).toBe(
        SubcategoryRecommendationStatus.ACTIVE
      );
    });
  });

  describe("Error handling", () => {
    it("should return 404 when subcategory does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/subcategories/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when subcategory is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted Subcategory",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Already Deleted Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id, {
        status: SubcategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });
  });
});
