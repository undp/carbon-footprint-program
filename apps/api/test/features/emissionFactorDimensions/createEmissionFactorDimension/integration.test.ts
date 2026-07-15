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
import { createTestEmissionFactorDimension } from "@test/factories/emissionFactorFactory.js";
import { createEmissionFactorDimensionService } from "@/features/emissionFactorDimensions/createEmissionFactorDimension/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";
import type { CreateEmissionFactorDimensionResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/emission-factor-dimensions/ - Integration Tests", () => {
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

  async function buildTestSubcategory() {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - For Dimension Creation",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Dim Parent Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Dim Subcategory",
    });
    return { methodology, category, subcategory };
  }

  describe("Successful creation", () => {
    it("should create a dimension with values and return 201", async () => {
      const { subcategory } = await buildTestSubcategory();

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Tipo de combustible",
          position: 1,
          isRequired: true,
          values: ["Diésel", "Gasolina"],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(
        response.body
      ) as CreateEmissionFactorDimensionResponse;

      expect(body.id).toBeTruthy();
      expect(body.subcategoryId).toBe(subcategory.id.toString());
      expect(body.name).toBe("Tipo de combustible");
      expect(body.position).toBe(1);
      expect(body.isRequired).toBe(true);
      expect(body.values).toHaveLength(2);
      expect(body.values.map((v) => v.value).sort()).toEqual([
        "Diésel",
        "Gasolina",
      ]);
    });

    it("should allow creating a second dimension at position 2", async () => {
      const { subcategory } = await buildTestSubcategory();

      // Create first dimension
      await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Dim 1",
          position: 1,
          isRequired: false,
          values: ["A"],
        },
      });

      // Create second dimension
      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Dim 2",
          position: 2,
          isRequired: false,
          values: ["X"],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(
        response.body
      ) as CreateEmissionFactorDimensionResponse;
      expect(body.position).toBe(2);
    });
  });

  describe("Validation errors", () => {
    it("should return 422 when subcategory already has 2 dimensions", async () => {
      const { subcategory } = await buildTestSubcategory();

      await createTestEmissionFactorDimension(prisma, subcategory.id, {
        position: 1,
      });
      await createTestEmissionFactorDimension(prisma, subcategory.id, {
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Third",
          position: 1,
          isRequired: false,
          values: ["V"],
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAX_DIMENSIONS_PER_SUBCATEGORY");
    });

    it("should return 409 when position is already taken", async () => {
      const { subcategory } = await buildTestSubcategory();

      await createTestEmissionFactorDimension(prisma, subcategory.id, {
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Duplicate position",
          position: 1,
          isRequired: false,
          values: ["V"],
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it("should return 400 when values array is empty", async () => {
      const { subcategory } = await buildTestSubcategory();

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "No values",
          position: 1,
          isRequired: false,
          values: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when values contain duplicates", async () => {
      const { subcategory } = await buildTestSubcategory();

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: subcategory.id.toString(),
          name: "Dup values",
          position: 1,
          isRequired: false,
          values: ["A", "A"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 when subcategory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factor-dimensions/",
        payload: {
          subcategoryId: "999999",
          name: "Orphan",
          position: 1,
          isRequired: false,
          values: ["V"],
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Direct service invocation (bypassing schema-level validation)", () => {
    // The route schema already rejects duplicate `values` entries via a zod
    // `.refine`, so the service's own defensive `seenValues` duplicate check
    // (helpers.ts-adjacent branch inside the service) can never be reached
    // through HTTP. Call the service directly (still against the real test
    // database, no mocks) to exercise that branch.
    it("should return 409 when the values array contains duplicates (service-level guard)", async () => {
      const { subcategory } = await buildTestSubcategory();
      const dbUser = await prisma.user.findFirstOrThrow();

      await expect(
        createEmissionFactorDimensionService(
          prisma,
          {
            subcategoryId: subcategory.id.toString(),
            name: "Bypass Schema Dup",
            position: 1,
            isRequired: false,
            values: ["Same", "Same"],
          },
          mapUserToResponse(dbUser)
        )
      ).rejects.toMatchObject({ code: "DUPLICATE_DIMENSION_VALUE" });
    });
  });

  describe("Concurrency", () => {
    // Two concurrent requests targeting the same subcategory + position both
    // pass the pre-check (`existingPosition` findFirst) before either commits,
    // so the second INSERT collides with the real partial unique index and
    // surfaces as a genuine Prisma P2002 in the service's catch block -- not
    // just the earlier application-level pre-check.
    it("should return 409 for exactly one of two concurrent creations at the same position", async () => {
      const { subcategory } = await buildTestSubcategory();

      const payload = {
        subcategoryId: subcategory.id.toString(),
        name: "Race Position",
        position: 1,
        isRequired: false,
        values: ["V"],
      };

      const [first, second] = await Promise.all([
        app.inject({
          method: "POST",
          url: "/api/emission-factor-dimensions/",
          payload,
        }),
        app.inject({
          method: "POST",
          url: "/api/emission-factor-dimensions/",
          payload: { ...payload, values: ["W"] },
        }),
      ]);

      const statusCodes = [first.statusCode, second.statusCode].sort();
      expect(statusCodes).toEqual([201, 409]);

      const conflictResponse = first.statusCode === 409 ? first : second;
      const body = JSON.parse(conflictResponse.body) as { code: string };
      // Under concurrency the losing INSERT can collide on either the
      // position partial unique index or the value uniqueness constraint
      // depending on interleaving, so assert the 409 carries one of the
      // known conflict codes rather than a single non-deterministic one.
      expect([
        "DIMENSION_POSITION_ALREADY_TAKEN",
        "DUPLICATE_DIMENSION_VALUE",
      ]).toContain(body.code);
    });
  });
});
