import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  TEST_EMISSION_FACTOR_YEAR,
  SEEDED_CATALOGUE_YEAR,
} from "@test/factories/emissionFactorFactory.js";
import {
  createInventoryFromPattern,
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";
import type { FastifyInstance, InjectOptions } from "fastify";
import { type PrismaClient, type User, SystemRole } from "@repo/database";
import type { GetCarbonInventoryMethodologyResponse } from "@repo/types";

// The ids never reach a service: the role check runs before it, so a
// nonexistent id proves the route is closed without seeding anything. Bodies
// must still be schema-valid because Fastify validates before the role hook.
const MISSING_ID = "999999999";

const ROUTES: Array<{ name: string; request: InjectOptions }> = [
  {
    name: "GET /api/emission-factors",
    request: {
      method: "GET",
      url: `/api/emission-factors?methodologyVersionId=${MISSING_ID}`,
    },
  },
  {
    name: "POST /api/emission-factors",
    request: {
      method: "POST",
      url: "/api/emission-factors/",
      payload: {
        subcategoryId: MISSING_ID,
        dimensionValue1Name: null,
        dimensionValue2Name: null,
        rateMeasurementUnitId: MISSING_ID,
        source: "Test source",
        year: TEST_EMISSION_FACTOR_YEAR,
        gasDetails: {},
        value: 1,
      },
    },
  },
  {
    name: "PATCH /api/emission-factors/:id",
    request: {
      method: "PATCH",
      url: `/api/emission-factors/${MISSING_ID}`,
      payload: { value: 2 },
    },
  },
  {
    name: "DELETE /api/emission-factors/:id",
    request: { method: "DELETE", url: `/api/emission-factors/${MISSING_ID}` },
  },
];

describe("Emission factor routes - Authorization", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function injectAs(role: SystemRole, request: InjectOptions) {
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role },
    });
    try {
      return await app.inject(request);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  }

  it.each(ROUTES)(
    "$name returns 403 when the caller has USER role",
    async ({ request }) => {
      const response = await injectAs(SystemRole.USER, request);

      expect(response.statusCode).toBe(403);
    }
  );

  it.each(ROUTES)(
    "$name lets a system ADMIN past the role check",
    async ({ request }) => {
      const response = await injectAs(SystemRole.ADMIN, request);

      expect(response.statusCode).not.toBe(403);
    }
  );

  // Footprint capture (calculator step 3) must not depend on the routes above:
  // it reads dimensions from the inventory's methodology and factors from the
  // inventory-scoped routes, which a USER who owns the footprint can reach.
  describe("Calculator catalogue routes for a USER who owns the footprint", () => {
    let carbonInventoryId: string;

    beforeAll(async () => {
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: SEEDED_CATALOGUE_YEAR }
      );
      carbonInventoryId = carbonInventory.id.toString();
    });

    afterAll(async () => {
      await cleanupCarbonInventoryTestData(prisma);
    });

    it.each(["methodology", "emission-factors", "emission-factor-years"])(
      "GET /api/carbon-inventories/:id/%s returns 200",
      async (resource) => {
        const response = await injectAs(SystemRole.USER, {
          method: "GET",
          url: `/api/carbon-inventories/${carbonInventoryId}/${resource}`,
        });

        expect(response.statusCode).toBe(200);
      }
    );

    it("returns the catalogue's dimensions and factors to the USER", async () => {
      const response = await injectAs(SystemRole.USER, {
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventoryId}/methodology`,
      });
      const subcategories = response
        .json<GetCarbonInventoryMethodologyResponse>()
        .categories.flatMap((category) => category.subcategories);

      expect(subcategories.some((s) => s.dimensions.length > 0)).toBe(true);
      expect(subcategories.some((s) => s.emissionFactors.length > 0)).toBe(
        true
      );
    });
  });
});
