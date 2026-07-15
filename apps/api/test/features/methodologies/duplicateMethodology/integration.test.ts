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
import { createTestCategory } from "@test/factories/categoryFactory.js";
import {
  createTestSubcategory,
  createTestSubcategoryUnits,
  getTestMeasurementUnitIds,
} from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import type { DuplicateMethodologyResponse } from "@repo/types";
import {
  CategoryStatus,
  SubcategoryStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus, Prisma } from "@repo/database";
import { duplicateMethodologyService } from "@/features/methodologies/duplicateMethodology/service.js";
import {
  cloneEmissionFactorDimensions,
  cloneEmissionFactors,
  cloneReductionPlanInitiatives,
  cloneSubcategoryRecommendations,
} from "@/features/methodologies/duplicateMethodology/helpers.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

describe("POST /api/methodologies/:id/duplicate - Integration Tests", () => {
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
    await restoreMethodologies(prisma);
  });

  describe("Successful duplication", () => {
    it("should duplicate a methodology and return 201", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Original",
        description: "Original description",
        regulation: "Original Regulation",
        version: "1.0",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.id).toBeTruthy();
      expect(body.id).not.toBe(original.id.toString());
      expect(body.name).toContain("(1)");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should copy all fields from the original except status and name", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Fields",
        description: "Should be copied",
        regulation: "Should be copied too",
        version: "5.0",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.description).toBe("Should be copied");
      expect(body.regulation).toBe("Should be copied too");
      expect(body.version).toBe("5.0");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should persist the duplicated methodology in the database", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - DB Verify Duplicate",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.UNPUBLISHED);
    });

    it("should increment numeric suffix if name with (1) already exists", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Naming",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      // First duplicate
      const firstDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(firstDuplicateResponse.statusCode).toBe(201);

      // Second duplicate - should get "(2)"
      const secondDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(secondDuplicateResponse.statusCode).toBe(201);

      const secondBody = JSON.parse(
        secondDuplicateResponse.body
      ) as DuplicateMethodologyResponse;

      expect(secondBody.name).toBe(`${original.name} (2)`);
    });

    it("should duplicate active categories from original methodology", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Categories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createTestCategory(prisma, original.id, {
        name: "Test - Category A",
        icon: "FACTORY",
        color: "#AA0000",
        synonyms: "a-syn",
        description: "Category A description",
        position: 1,
      });
      await createTestCategory(prisma, original.id, {
        name: "Test - Category B",
        icon: "TRUCK",
        color: "#BB0000",
        synonyms: "b-syn",
        description: "Category B description",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: {
          methodologyVersionId: BigInt(body.id),
          status: CategoryStatus.ACTIVE,
        },
        orderBy: { position: "asc" },
      });

      expect(duplicatedCategories).toHaveLength(2);
      expect(duplicatedCategories[0].name).toBe("Test - Category A");
      expect(duplicatedCategories[0].icon).toBe("FACTORY");
      expect(duplicatedCategories[0].color).toBe("#AA0000");
      expect(duplicatedCategories[0].position).toBe(1);
      expect(duplicatedCategories[1].name).toBe("Test - Category B");
      expect(duplicatedCategories[1].icon).toBe("TRUCK");
      expect(duplicatedCategories[1].color).toBe("#BB0000");
      expect(duplicatedCategories[1].position).toBe(2);
    });

    it("should duplicate active subcategories from original methodology", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Subcategories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Category With Subs",
        position: 1,
      });

      await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub A",
        description: "Subcategory A",
      });
      await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub B",
        description: "Subcategory B",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      expect(duplicatedCategories).toHaveLength(1);

      const duplicatedSubcategories = await prisma.subcategory.findMany({
        where: { categoryId: duplicatedCategories[0].id },
        orderBy: { name: "asc" },
      });

      expect(duplicatedSubcategories).toHaveLength(2);
      expect(duplicatedSubcategories[0].name).toBe("Test - Sub A");
      expect(duplicatedSubcategories[0].description).toBe("Subcategory A");
      expect(duplicatedSubcategories[1].name).toBe("Test - Sub B");
      expect(duplicatedSubcategories[1].description).toBe("Subcategory B");
    });

    it("should duplicate measurement unit associations for subcategories", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Units",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Category With Units",
        position: 1,
      });

      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub With Units A",
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Sub With Units B",
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 3);
      await createTestSubcategoryUnits(prisma, subA.id, unitIds.slice(0, 2));
      await createTestSubcategoryUnits(prisma, subB.id, unitIds.slice(1, 3));

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const duplicatedSubs = await prisma.subcategory.findMany({
        where: { categoryId: duplicatedCategories[0].id },
        orderBy: { name: "asc" },
        include: {
          subcategoryMeasurementUnits: {
            select: { measurementUnitId: true },
            orderBy: { measurementUnitId: "asc" },
          },
        },
      });

      expect(duplicatedSubs).toHaveLength(2);

      const dupAUnits = duplicatedSubs[0].subcategoryMeasurementUnits.map(
        (u) => u.measurementUnitId
      );
      const dupBUnits = duplicatedSubs[1].subcategoryMeasurementUnits.map(
        (u) => u.measurementUnitId
      );

      const originalAUnits = unitIds
        .slice(0, 2)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const originalBUnits = unitIds
        .slice(1, 3)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

      expect(dupAUnits).toEqual(originalAUnits);
      expect(dupBUnits).toEqual(originalBUnits);
    });

    it("should not duplicate deleted subcategories", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Skip Deleted Subs",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Category Mixed Subs",
        position: 1,
      });

      await createTestSubcategory(prisma, category.id, {
        name: "Test - Active Sub",
      });
      await createTestSubcategory(prisma, category.id, {
        name: "Test - Deleted Sub",
        status: SubcategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });

      const duplicatedSubcategories = await prisma.subcategory.findMany({
        where: { categoryId: duplicatedCategories[0].id },
      });

      expect(duplicatedSubcategories).toHaveLength(1);
      expect(duplicatedSubcategories[0].name).toBe("Test - Active Sub");
      expect(duplicatedSubcategories[0].status).toBe(SubcategoryStatus.ACTIVE);
    });

    it("should map subcategories to the correct duplicated category", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Category Mapping",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const catA = await createTestCategory(prisma, original.id, {
        name: "Test - Cat A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, original.id, {
        name: "Test - Cat B",
        position: 2,
      });

      await createTestSubcategory(prisma, catA.id, {
        name: "Test - Sub in Cat A",
      });
      await createTestSubcategory(prisma, catB.id, {
        name: "Test - Sub in Cat B",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
        orderBy: { position: "asc" },
        include: { subcategories: true },
      });

      expect(duplicatedCategories).toHaveLength(2);
      expect(duplicatedCategories[0].name).toBe("Test - Cat A");
      expect(duplicatedCategories[0].subcategories).toHaveLength(1);
      expect(duplicatedCategories[0].subcategories[0].name).toBe(
        "Test - Sub in Cat A"
      );
      expect(duplicatedCategories[1].name).toBe("Test - Cat B");
      expect(duplicatedCategories[1].subcategories).toHaveLength(1);
      expect(duplicatedCategories[1].subcategories[0].name).toBe(
        "Test - Sub in Cat B"
      );
    });

    it("should not duplicate subcategories from deleted categories", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Deleted Cat No Subs",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const deletedCat = await createTestCategory(prisma, original.id, {
        name: "Test - Deleted Cat With Sub",
        position: 1,
        status: CategoryStatus.DELETED,
      });

      await createTestSubcategory(prisma, deletedCat.id, {
        name: "Test - Sub Under Deleted Cat",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      expect(duplicatedCategories).toHaveLength(0);

      const duplicatedSubcategories = await prisma.subcategory.findMany({
        where: {
          categoryId: {
            in: duplicatedCategories.map((c) => c.id),
          },
        },
      });
      expect(duplicatedSubcategories).toHaveLength(0);
    });

    it("should not duplicate deleted categories", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Skip Deleted",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createTestCategory(prisma, original.id, {
        name: "Test - Active Category",
        position: 1,
      });
      await createTestCategory(prisma, original.id, {
        name: "Test - Deleted Category",
        position: 2,
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });

      expect(duplicatedCategories).toHaveLength(1);
      expect(duplicatedCategories[0].name).toBe("Test - Active Category");
      expect(duplicatedCategories[0].status).toBe(CategoryStatus.ACTIVE);
    });
  });

  it("should duplicate emission factors with their dimensions and dimension values", async () => {
    const original = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Duplicate With EFs",
      status: MethodologyVersionStatus.UNPUBLISHED,
    });

    const category = await createTestCategory(prisma, original.id, {
      name: "Test - EF Category",
      position: 1,
    });

    const sub = await createTestSubcategory(prisma, category.id, {
      name: "Test - EF Sub",
    });

    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    // Create dimension with values
    const dim = await createTestEmissionFactorDimension(prisma, sub.id, {
      code: "animal_type",
      name: "Tipo de animal",
      position: 1,
      isRequired: true,
    });

    const val1 = await createTestEmissionFactorDimensionValue(prisma, dim.id, {
      value: "Búfalos",
    });
    const val2 = await createTestEmissionFactorDimensionValue(prisma, dim.id, {
      value: "Vacas",
    });

    // Create emission factors using same source (trigger enforces single source per subcategory)
    const factor1 = await createTestEmissionFactor(prisma, sub.id, rateUnitId, {
      dimensionValue1Id: val1.id,
      source: "IPCC",
      value: "2.5",
    });
    await createTestEmissionFactor(prisma, sub.id, rateUnitId, {
      dimensionValue1Id: val2.id,
      source: "IPCC",
      value: "3.0",
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/methodologies/${original.id}/duplicate`,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

    // Find duplicated subcategory
    const dupCategories = await prisma.category.findMany({
      where: { methodologyVersionId: BigInt(body.id) },
    });
    const dupSubs = await prisma.subcategory.findMany({
      where: { categoryId: dupCategories[0].id },
    });
    expect(dupSubs).toHaveLength(1);

    // Check dimensions were duplicated
    const dupDimensions = await prisma.emissionFactorDimension.findMany({
      where: { subcategoryId: dupSubs[0].id },
    });
    expect(dupDimensions).toHaveLength(1);
    expect(dupDimensions[0].code).toBe("animal_type");
    expect(dupDimensions[0].name).toBe("Tipo de animal");
    expect(dupDimensions[0].isRequired).toBe(true);

    // Check dimension values were duplicated
    const dupValues = await prisma.emissionFactorDimensionValue.findMany({
      where: { dimensionId: dupDimensions[0].id },
      orderBy: { value: "asc" },
    });
    expect(dupValues).toHaveLength(2);
    expect(dupValues[0].value).toBe("Búfalos");
    expect(dupValues[1].value).toBe("Vacas");

    // Check emission factors were duplicated
    const dupFactors = await prisma.emissionFactor.findMany({
      where: { subcategoryId: dupSubs[0].id },
      orderBy: { value: "asc" },
    });
    expect(dupFactors).toHaveLength(2);
    expect(dupFactors[0].source).toBe("IPCC");
    expect(dupFactors[0].value.toString()).toBe("2.5");
    expect(dupFactors[0].dimensionValue1Id).toBe(dupValues[0].id);
    expect(dupFactors[1].value.toString()).toBe("3");
    expect(dupFactors[1].dimensionValue1Id).toBe(dupValues[1].id);

    // Ensure new IDs are different from originals
    expect(dupDimensions[0].id).not.toBe(dim.id);
    expect(dupValues[0].id).not.toBe(val1.id);
    expect(dupFactors[0].id).not.toBe(factor1.id);
  });

  it("should not duplicate deleted emission factors", async () => {
    const original = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Duplicate Skip Deleted EFs",
      status: MethodologyVersionStatus.UNPUBLISHED,
    });

    const category = await createTestCategory(prisma, original.id, {
      name: "Test - EF Deleted Category",
      position: 1,
    });

    const sub = await createTestSubcategory(prisma, category.id, {
      name: "Test - EF Deleted Sub",
    });

    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    await createTestEmissionFactor(prisma, sub.id, rateUnitId, {
      source: "DEFRA 2025",
      status: EmissionFactorStatus.ACTIVE,
    });
    await createTestEmissionFactor(prisma, sub.id, rateUnitId, {
      source: "DEFRA 2025",
      status: EmissionFactorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/methodologies/${original.id}/duplicate`,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

    const dupCategories = await prisma.category.findMany({
      where: { methodologyVersionId: BigInt(body.id) },
    });
    const dupSubs = await prisma.subcategory.findMany({
      where: { categoryId: dupCategories[0].id },
    });

    const dupFactors = await prisma.emissionFactor.findMany({
      where: { subcategoryId: dupSubs[0].id },
    });

    expect(dupFactors).toHaveLength(1);
    expect(dupFactors[0].status).toBe(EmissionFactorStatus.ACTIVE);
  });

  it("should duplicate dimension values with parent references", async () => {
    const original = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Duplicate Parent Values",
      status: MethodologyVersionStatus.UNPUBLISHED,
    });

    const category = await createTestCategory(prisma, original.id, {
      name: "Test - Parent Val Category",
      position: 1,
    });

    const sub = await createTestSubcategory(prisma, category.id, {
      name: "Test - Parent Val Sub",
    });

    const dim = await createTestEmissionFactorDimension(prisma, sub.id, {
      code: "region",
      name: "Región",
      position: 1,
    });

    const parentVal = await createTestEmissionFactorDimensionValue(
      prisma,
      dim.id,
      { value: "América" }
    );
    const childVal = await createTestEmissionFactorDimensionValue(
      prisma,
      dim.id,
      { value: "Chile", parentValueId: parentVal.id }
    );

    const response = await app.inject({
      method: "POST",
      url: `/api/methodologies/${original.id}/duplicate`,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

    const dupCategories = await prisma.category.findMany({
      where: { methodologyVersionId: BigInt(body.id) },
    });
    const dupSubs = await prisma.subcategory.findMany({
      where: { categoryId: dupCategories[0].id },
    });
    const dupDims = await prisma.emissionFactorDimension.findMany({
      where: { subcategoryId: dupSubs[0].id },
    });
    const dupValues = await prisma.emissionFactorDimensionValue.findMany({
      where: { dimensionId: dupDims[0].id },
      orderBy: { value: "asc" },
    });

    expect(dupValues).toHaveLength(2);
    const dupAmerica = dupValues.find((v) => v.value === "América")!;
    const dupChile = dupValues.find((v) => v.value === "Chile")!;

    expect(dupAmerica.parentValueId).toBeNull();
    expect(dupChile.parentValueId).toBe(dupAmerica.id);

    // Ensure IDs are different from originals
    expect(dupAmerica.id).not.toBe(parentVal.id);
    expect(dupChile.id).not.toBe(childVal.id);
  });

  describe("Reduction plan initiatives duplication", () => {
    it("should duplicate active initiatives and remap dimension value references", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Initiatives",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Initiative Category",
        position: 1,
      });

      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Initiative Sub",
      });

      const dim = await createTestEmissionFactorDimension(prisma, sub.id, {
        code: "fuel_type",
        name: "Tipo de combustible",
        position: 1,
      });

      const val1 = await createTestEmissionFactorDimensionValue(
        prisma,
        dim.id,
        { value: "Diésel" }
      );
      const val2 = await createTestEmissionFactorDimensionValue(
        prisma,
        dim.id,
        { value: "Gasolina" }
      );

      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          dimensionValue1Id: val1.id,
          dimensionValue2Id: null,
          title: "Test - Initiative With Dim",
          description: "Switch to electric",
          status: ReductionPlanInitiativeStatus.ACTIVE,
        },
      });
      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          dimensionValue1Id: val2.id,
          dimensionValue2Id: null,
          title: "Test - Initiative Plain",
          description: "Reduce trips",
          status: ReductionPlanInitiativeStatus.ACTIVE,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupValues = await prisma.emissionFactorDimensionValue.findMany({
        where: { dimension: { subcategoryId: dupSubs[0].id } },
      });
      const dupValByText = new Map(dupValues.map((v) => [v.value, v.id]));

      const dupInitiatives = await prisma.reductionPlanInitiative.findMany({
        where: { subcategoryId: dupSubs[0].id },
        orderBy: { title: "asc" },
      });

      expect(dupInitiatives).toHaveLength(2);
      expect(dupInitiatives[0].title).toBe("Test - Initiative Plain");
      expect(dupInitiatives[0].dimensionValue1Id).toBe(
        dupValByText.get("Gasolina")
      );
      expect(dupInitiatives[0].dimensionValue2Id).toBeNull();
      expect(dupInitiatives[1].title).toBe("Test - Initiative With Dim");
      expect(dupInitiatives[1].dimensionValue1Id).toBe(
        dupValByText.get("Diésel")
      );
      expect(dupInitiatives[1].dimensionValue2Id).toBeNull();

      // IDs differ from originals
      const originalIds = (
        await prisma.reductionPlanInitiative.findMany({
          where: { subcategoryId: sub.id },
          select: { id: true },
        })
      ).map((i) => i.id);
      for (const dup of dupInitiatives) {
        expect(originalIds).not.toContain(dup.id);
      }
    });

    it("should not duplicate deleted initiatives", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Skip Deleted Initiatives",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Initiative Skip Cat",
        position: 1,
      });

      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Initiative Skip Sub",
      });

      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          title: "Test - Active Initiative",
          description: "Keep",
          status: ReductionPlanInitiativeStatus.ACTIVE,
        },
      });
      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          title: "Test - Deleted Initiative",
          description: "Drop",
          status: ReductionPlanInitiativeStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupInitiatives = await prisma.reductionPlanInitiative.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });

      expect(dupInitiatives).toHaveLength(1);
      expect(dupInitiatives[0].title).toBe("Test - Active Initiative");
      expect(dupInitiatives[0].status).toBe(
        ReductionPlanInitiativeStatus.ACTIVE
      );
    });
  });

  describe("Subcategory recommendations duplication", () => {
    it("should duplicate active recommendations preserving sector and subsector", async () => {
      const sectors = await prisma.countrySector.findMany({
        take: 2,
        include: { subsectors: { take: 1 } },
      });
      if (sectors.length < 2) {
        throw new Error("Expected at least 2 seeded CountrySector records");
      }
      const sectorA = sectors[0];
      const sectorB = sectors[1];
      const subsectorA = sectorA.subsectors[0];
      if (!subsectorA) {
        throw new Error("Expected at least 1 CountrySubsector for sector 0");
      }

      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Recommendations",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Recommendation Cat",
        position: 1,
      });

      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Recommendation Sub",
      });

      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: sub.id,
          sectorId: sectorA.id,
          subsectorId: subsectorA.id,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: sub.id,
          sectorId: sectorB.id,
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });

      const dupRecs = await prisma.subcategoryRecommendation.findMany({
        where: { subcategoryId: dupSubs[0].id },
        orderBy: { sectorId: "asc" },
      });

      const expected = [
        { sectorId: sectorA.id, subsectorId: subsectorA.id },
        { sectorId: sectorB.id, subsectorId: null },
      ].sort((a, b) => (a.sectorId < b.sectorId ? -1 : 1));

      expect(dupRecs).toHaveLength(2);
      expect(dupRecs[0].sectorId).toBe(expected[0].sectorId);
      expect(dupRecs[0].subsectorId).toBe(expected[0].subsectorId);
      expect(dupRecs[0].status).toBe(SubcategoryRecommendationStatus.ACTIVE);
      expect(dupRecs[1].sectorId).toBe(expected[1].sectorId);
      expect(dupRecs[1].subsectorId).toBe(expected[1].subsectorId);
    });

    it("should not duplicate deleted recommendations", async () => {
      const sectors = await prisma.countrySector.findMany({ take: 1 });
      if (sectors.length < 1) {
        throw new Error("Expected at least 1 seeded CountrySector record");
      }
      const sector = sectors[0];

      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Skip Deleted Recommendations",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Recommendation Skip Cat",
        position: 1,
      });

      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Recommendation Skip Sub",
      });

      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: sub.id,
          sectorId: sector.id,
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: sub.id,
          sectorId: sector.id,
          subsectorId: null,
          status: SubcategoryRecommendationStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupRecs = await prisma.subcategoryRecommendation.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });

      expect(dupRecs).toHaveLength(1);
      expect(dupRecs[0].status).toBe(SubcategoryRecommendationStatus.ACTIVE);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const maxId =
        (await prisma.methodologyVersion.aggregate({ _max: { id: true } }))._max
          .id ?? 0n;
      const nonExistentId = maxId + 1n;

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${nonExistentId}/duplicate`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });
  });

  describe("Dimension value parent remapping edge cases", () => {
    it("should drop parentValueId (leave it null) when the parent value's own status is not ACTIVE", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Broken Parent Link",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Broken Parent Cat",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Broken Parent Sub",
      });
      const dim = await createTestEmissionFactorDimension(prisma, sub.id, {
        code: "broken_parent",
        name: "Broken parent dimension",
        position: 1,
      });

      // Parent is soft-deleted, so it is excluded from the active-values query
      // and never receives a remapped id — the child's parentValueId reference
      // is orphaned and must not be backfilled.
      const parentVal = await createTestEmissionFactorDimensionValue(
        prisma,
        dim.id,
        { value: "Orphan Parent", status: "DELETED" }
      );
      const childVal = await createTestEmissionFactorDimensionValue(
        prisma,
        dim.id,
        { value: "Orphan Child", parentValueId: parentVal.id }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupDims = await prisma.emissionFactorDimension.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });
      const dupValues = await prisma.emissionFactorDimensionValue.findMany({
        where: { dimensionId: dupDims[0].id },
      });

      // Only the active child is cloned — the DELETED parent is not.
      expect(dupValues).toHaveLength(1);
      expect(dupValues[0].value).toBe("Orphan Child");
      expect(dupValues[0].parentValueId).toBeNull();
      expect(dupValues[0].id).not.toBe(childVal.id);
    });

    it("should link multiple sibling values to the same duplicated parent", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Shared Parent Siblings",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Shared Parent Cat",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Shared Parent Sub",
      });
      const dim = await createTestEmissionFactorDimension(prisma, sub.id, {
        code: "shared_parent",
        name: "Shared parent dimension",
        position: 1,
      });

      const parentVal = await createTestEmissionFactorDimensionValue(
        prisma,
        dim.id,
        { value: "Shared Parent" }
      );
      await createTestEmissionFactorDimensionValue(prisma, dim.id, {
        value: "Sibling A",
        parentValueId: parentVal.id,
      });
      await createTestEmissionFactorDimensionValue(prisma, dim.id, {
        value: "Sibling B",
        parentValueId: parentVal.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupDims = await prisma.emissionFactorDimension.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });
      const dupValues = await prisma.emissionFactorDimensionValue.findMany({
        where: { dimensionId: dupDims[0].id },
      });

      expect(dupValues).toHaveLength(3);
      const dupParent = dupValues.find((v) => v.value === "Shared Parent")!;
      const dupSiblingA = dupValues.find((v) => v.value === "Sibling A")!;
      const dupSiblingB = dupValues.find((v) => v.value === "Sibling B")!;

      expect(dupSiblingA.parentValueId).toBe(dupParent.id);
      expect(dupSiblingB.parentValueId).toBe(dupParent.id);
    });
  });

  describe("Emission factor gasDetails handling", () => {
    it("should preserve a null gasDetails value (JsonNull fallback) instead of dropping the row", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Null Gas Details",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Null Gas Cat",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Null Gas Sub",
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      await prisma.emissionFactor.create({
        data: {
          subcategoryId: sub.id,
          rateMeasurementUnitId: rateUnitId,
          source: "Test - Null Gas Source",
          gasDetails: Prisma.JsonNull,
          value: new Prisma.Decimal("1"),
          status: EmissionFactorStatus.ACTIVE,
          createdById: null,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupFactors = await prisma.emissionFactor.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });

      expect(dupFactors).toHaveLength(1);
      expect(dupFactors[0].gasDetails).toBeNull();
    });
  });

  describe("Cross-subtree dimension value references (dangling remap)", () => {
    it("should null out dimension value references that point outside the duplicated subtree", async () => {
      // A "foreign" methodology holds a dimension/value that is NOT part of the
      // methodology being duplicated. Both the factor and the initiative below
      // reference it directly (an unusual but not FK-prevented state) so we can
      // exercise the `?? null` fallback when the id lookup misses.
      const foreignMethodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Foreign Source Methodology",
      });
      const foreignCategory = await createTestCategory(
        prisma,
        foreignMethodology.id,
        { name: "Test - Foreign Cat", position: 1 }
      );
      const foreignSub = await createTestSubcategory(
        prisma,
        foreignCategory.id,
        { name: "Test - Foreign Sub" }
      );
      const foreignDim1 = await createTestEmissionFactorDimension(
        prisma,
        foreignSub.id,
        { code: "foreign_dim_1", name: "Foreign Dimension 1", position: 1 }
      );
      const foreignDim2 = await createTestEmissionFactorDimension(
        prisma,
        foreignSub.id,
        { code: "foreign_dim_2", name: "Foreign Dimension 2", position: 2 }
      );
      const foreignVal1 = await createTestEmissionFactorDimensionValue(
        prisma,
        foreignDim1.id,
        { value: "Foreign Value 1" }
      );
      const foreignVal2 = await createTestEmissionFactorDimensionValue(
        prisma,
        foreignDim2.id,
        { value: "Foreign Value 2" }
      );

      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Dangling Ref Source",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const category = await createTestCategory(prisma, original.id, {
        name: "Test - Dangling Ref Cat",
        position: 1,
      });
      const sub = await createTestSubcategory(prisma, category.id, {
        name: "Test - Dangling Ref Sub",
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      await createTestEmissionFactor(prisma, sub.id, rateUnitId, {
        dimensionValue1Id: foreignVal1.id,
        dimensionValue2Id: foreignVal2.id,
        source: "Test - Dangling Ref Factor",
      });
      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: sub.id,
          dimensionValue1Id: foreignVal1.id,
          dimensionValue2Id: null,
          title: "Test - Dangling Ref Initiative",
          description: "References a value outside the duplicated subtree",
          status: ReductionPlanInitiativeStatus.ACTIVE,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dupCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });
      const dupSubs = await prisma.subcategory.findMany({
        where: { categoryId: dupCategories[0].id },
      });
      const dupFactors = await prisma.emissionFactor.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });
      const dupInitiatives = await prisma.reductionPlanInitiative.findMany({
        where: { subcategoryId: dupSubs[0].id },
      });

      expect(dupFactors).toHaveLength(1);
      expect(dupFactors[0].dimensionValue1Id).toBeNull();
      expect(dupFactors[0].dimensionValue2Id).toBeNull();

      expect(dupInitiatives).toHaveLength(1);
      expect(dupInitiatives[0].dimensionValue1Id).toBeNull();
    });
  });

  describe("Real database-level P2002 conflicts (bypassing the in-app copy-name generator)", () => {
    // `generateUniqueCopyName` reads existing (non-DELETED) names for the
    // country inside the same transaction as the eventual INSERT, so a
    // *sequential* (already-committed) conflicting name is always avoided by
    // that generator, never reaching the service's own `catch` block. Hold a
    // conflicting row open (uncommitted) with the exact name the generator
    // will produce in a separate transaction, so the service's own read
    // (under READ COMMITTED) can't see it, forcing its own INSERT to
    // collide with the real (country_id, name, version) unique index once
    // the holder transaction commits.
    it("should surface a real Prisma P2002 as METHODOLOGY_NAME_VERSION_ALREADY_EXISTS when a concurrent transaction holds the generated copy name", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Race Duplicate Name",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const originalFull = await prisma.methodologyVersion.findUniqueOrThrow({
        where: { id: original.id },
      });

      // No other duplicate exists yet, so the service will generate
      // "<name> (1)" as the copy name.
      const predictedName = `${original.name} (1)`;

      const holderPromise = prisma.$transaction(async (tx) => {
        await tx.methodologyVersion.create({
          data: {
            countryId: originalFull.countryId,
            name: predictedName,
            description: "Holder",
            regulation: "Holder",
            version: originalFull.version,
            status: MethodologyVersionStatus.UNPUBLISHED,
            updatedAt: null,
          },
        });
        // Hold the row open (uncommitted) long enough for the concurrent
        // duplicate call below to run its own `existingNames` read (which
        // can't see this uncommitted row) and reach its own INSERT, which
        // then blocks on the real unique index until this transaction
        // commits. `pg_sleep` returns `void`, which the driver adapter
        // can't deserialize via `$queryRaw`, so `$executeRaw` is used
        // instead.
        await tx.$executeRaw`SELECT pg_sleep(0.3)`;
      });

      // Give the holder's INSERT time to land before starting the duplicate call.
      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(
        duplicateMethodologyService(prisma, original.id.toString(), null)
      ).rejects.toMatchObject({
        code: "METHODOLOGY_NAME_VERSION_ALREADY_EXISTS",
      });

      await holderPromise;
    });

    it("should rethrow a non-duplicate database error unchanged (foreign key violation)", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - FK Violation Duplicate",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const testUser = await getTestLoggedUser(prisma);
      const bogusUser = {
        ...mapUserToResponse(testUser),
        id: "999999999999",
      };

      await expect(
        duplicateMethodologyService(prisma, original.id.toString(), bogusUser)
      ).rejects.toThrow();
    });
  });

  describe("Duplicating without an authenticated user", () => {
    it("should set createdById to null when there is no current user", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - No User Duplicate",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const result = await duplicateMethodologyService(
        prisma,
        original.id.toString(),
        null
      );

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(result.id) },
      });
      expect(dbRecord!.createdById).toBeNull();
    });
  });

  describe("Helper functions — empty-input guards (direct unit tests)", () => {
    // `duplicateMethodologyService` short-circuits to the plain methodology
    // (no children cloned) as soon as `subcategoryIdMap` is empty, so these
    // guard clauses inside the individual clone helpers are never reached
    // through the HTTP endpoint. Calling them directly with an empty map is
    // the only way to exercise the "nothing to clone" branch.
    it("cloneEmissionFactorDimensions returns an empty map for an empty subcategory map", async () => {
      const result = await prisma.$transaction((tx) =>
        cloneEmissionFactorDimensions(tx, new Map(), null)
      );
      expect(result.size).toBe(0);
    });

    it("cloneEmissionFactors resolves without error for an empty subcategory map", async () => {
      await expect(
        prisma.$transaction((tx) =>
          cloneEmissionFactors(tx, new Map(), new Map(), null)
        )
      ).resolves.toBeUndefined();
    });

    it("cloneReductionPlanInitiatives resolves without error for an empty subcategory map", async () => {
      await expect(
        prisma.$transaction((tx) =>
          cloneReductionPlanInitiatives(tx, new Map(), new Map(), null)
        )
      ).resolves.toBeUndefined();
    });

    it("cloneSubcategoryRecommendations resolves without error for an empty subcategory map", async () => {
      await expect(
        prisma.$transaction((tx) =>
          cloneSubcategoryRecommendations(tx, new Map(), null)
        )
      ).resolves.toBeUndefined();
    });
  });
});
