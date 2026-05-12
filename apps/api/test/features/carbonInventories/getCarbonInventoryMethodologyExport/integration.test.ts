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
import {
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import { cleanupTestMemberships } from "@test/factories/membershipFactory.js";
import {
  createEmptyMethodologyVersion,
  getTestMethodologyVersionId,
} from "@test/factories/methodologyFactory.js";
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type {
  GetCarbonInventoryMethodologyExportResponse,
  GetMethodologyExportResponse,
} from "@repo/types";
import { GetCarbonInventoryMethodologyExportResponseSchema } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  MethodologyVersionStatus,
  SystemRole,
  type PrismaClient,
} from "@repo/database";
import type { FastifyInstance } from "fastify";

describe("GET /api/carbon-inventories/:id/methodology-export - Integration Tests", () => {
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
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
    await restoreMethodologies(prisma);
  });

  it("returns 200 with the full methodology hierarchy when status is PUBLISHED", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Energía",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Electricidad",
    });
    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { name: "Test - Región", position: 1 }
    );
    await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
      value: "Test - Norte",
    });
    const rateMeasurementUnitId = await getTestRateMeasurementUnitId(prisma);
    await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateMeasurementUnitId,
      {
        source: "Test - Source",
        value: "0.42",
      }
    );

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { methodologyVersionId: methodology.id }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetCarbonInventoryMethodologyExportResponse;
    expect(() =>
      GetCarbonInventoryMethodologyExportResponseSchema.parse(body)
    ).not.toThrow();
    expect(body.id).toBe(methodology.id.toString());
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].subcategories).toHaveLength(1);
    expect(body.categories[0].subcategories[0].emissionFactors).toHaveLength(1);
  });

  it("returns 200 when the methodology version is UNPUBLISHED", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.UNPUBLISHED,
    });
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { methodologyVersionId: methodology.id }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns 404 when the methodology version is DELETED", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { methodologyVersionId: methodology.id }
    );

    // Soft-delete the methodology version after inventory creation, mirroring
    // the production scenario where the methodology gets retired mid-flight.
    await prisma.methodologyVersion.update({
      where: { id: methodology.id },
      data: { status: MethodologyVersionStatus.DELETED },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("allows anonymous requests when x-carbon-inventory-uuid matches", async () => {
    const methodologyVersionId = await getTestMethodologyVersionId(prisma);
    const inventory = await prisma.carbonInventory.create({
      data: {
        usageMode: "SIMPLIFIED",
        createdById: null,
        methodologyVersionId,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
      headers: { "x-carbon-inventory-uuid": inventory.uuid },
    });

    expect(response.statusCode).toBe(200);
  });

  it("denies cross-organization users without admin bypass", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const originalRole = testUser.role;
    const otherCreator = await prisma.user.create({
      data: {
        email: `creator-${Date.now()}@test.example.com`,
        idpUserId: `test-idp-${Date.now()}`,
        firstName: "Other",
        lastName: "Creator",
      },
    });
    const organization = await createTestOrganization(prisma);

    try {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: otherCreator.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
      });
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("allows system admins from another organization (admin bypass)", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const originalRole = testUser.role;
    const otherCreator = await prisma.user.create({
      data: {
        email: `creator-${Date.now()}@test.example.com`,
        idpUserId: `test-idp-${Date.now()}`,
        firstName: "Other",
        lastName: "Creator",
      },
    });
    const organization = await createTestOrganization(prisma);

    try {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: otherCreator.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("returns 403 when the inventory does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/carbon-inventories/999999999/methodology-export",
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as ApiErrorResponse;
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns a response body byte-identical to the admin export endpoint", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Parity",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Parity Subcategory",
    });
    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { name: "Test - Parity Dimension", position: 1 }
    );
    await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
      value: "Test - Parity Value",
    });
    const rateMeasurementUnitId = await getTestRateMeasurementUnitId(prisma);
    await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateMeasurementUnitId,
      { source: "Test - Parity Source", value: "1.23" }
    );

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { methodologyVersionId: methodology.id }
    );

    const [adminResp, userResp] = await Promise.all([
      app.inject({
        method: "GET",
        url: `/api/methodologies/${methodology.id.toString()}/export`,
      }),
      app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/methodology-export`,
      }),
    ]);

    expect(adminResp.statusCode).toBe(200);
    expect(userResp.statusCode).toBe(200);
    const adminBody = JSON.parse(
      adminResp.body
    ) as GetMethodologyExportResponse;
    const userBody = JSON.parse(
      userResp.body
    ) as GetCarbonInventoryMethodologyExportResponse;
    expect(userBody).toEqual(adminBody);
  });
});
