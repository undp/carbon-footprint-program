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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  SystemRole,
} from "@repo/database/enums";
import type { CreateSubcategoryRecommendationResponse } from "@repo/types";

describe("POST /api/subcategory-recommendations - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let sectorId: number;
  let subsectorId: number | null;
  let subcategoryId: number;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);

    const sector = await prisma.countrySector.findFirst({
      orderBy: { id: "asc" },
    });
    const subcategory = await prisma.subcategory.findFirst({
      orderBy: { id: "asc" },
    });

    if (!sector || !subcategory) {
      throw new Error("No sector or subcategory found in test DB");
    }

    sectorId = Number(sector.id);
    subsectorId = null;
    subcategoryId = Number(subcategory.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.subcategoryRecommendation.deleteMany({
      where: {
        sectorId: BigInt(sectorId),
        subsectorId: null,
        createdById: testUser.id,
      },
    });
  });

  describe("Successful creation", () => {
    it("should create rows and return 201 with createdById populated", async () => {
      const payload = {
        sectorId,
        subsectorId,
        subcategoryIds: [subcategoryId],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(
        response.body
      ) as CreateSubcategoryRecommendationResponse;
      expect(body.sectorId).toBe(sectorId);
      expect(body.subcategoryIds).toContain(subcategoryId);

      const created = await prisma.subcategoryRecommendation.findFirst({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
        orderBy: { id: "desc" },
      });
      expect(created).not.toBeNull();
      expect(created!.createdById).toBe(testUser.id);
    });

    it("should succeed after all rows for the tuple are soft-deleted", async () => {
      await prisma.subcategoryRecommendation.create({
        data: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.DELETED,
          createdById: testUser.id,
        },
      });

      const payload = {
        sectorId,
        subsectorId,
        subcategoryIds: [subcategoryId],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload,
      });

      expect(response.statusCode).toBe(201);

      const activeCount = await prisma.subcategoryRecommendation.count({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
      });
      expect(activeCount).toBe(1);
    });
  });

  describe("Conflict — 409", () => {
    it("should return 409 when an ACTIVE row already exists for the tuple", async () => {
      await prisma.subcategoryRecommendation.create({
        data: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
      });

      const payload = {
        sectorId,
        subsectorId,
        subcategoryIds: [subcategoryId],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_RECOMMENDATION_GROUP_ALREADY_EXISTS");
    });
  });

  describe("Validation — 400", () => {
    it("should return 400 for empty subcategoryIds", async () => {
      const payload = { sectorId, subsectorId, subcategoryIds: [] };
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload,
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for duplicate subcategoryIds", async () => {
      const payload = {
        sectorId,
        subsectorId,
        subcategoryIds: [subcategoryId, subcategoryId],
      };
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload,
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Auth guard", () => {
    it("should return 403 for non-admin users", async () => {
      const originalRole = testUser.role;
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/subcategory-recommendations",
          payload: { sectorId, subsectorId, subcategoryIds: [subcategoryId] },
        });
        expect(response.statusCode).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: originalRole },
        });
      }
    });
  });
});
