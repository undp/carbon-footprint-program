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
import type { UpdateSubcategoryRecommendationResponse } from "@repo/types";

describe("PUT /api/subcategory-recommendations - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let sectorId: number;
  let subcategoryIds: number[];

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);

    const sector = await prisma.countrySector.findFirst({
      orderBy: { id: "asc" },
    });
    const subcategories = await prisma.subcategory.findMany({
      take: 3,
      orderBy: { id: "asc" },
    });

    if (!sector || subcategories.length < 3) {
      throw new Error("Insufficient test data in DB");
    }

    sectorId = Number(sector.id);
    subcategoryIds = subcategories.map((s) => Number(s.id));
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

  const url = () => `/api/subcategory-recommendations?sectorId=${sectorId}`;

  const seedActive = async (ids: number[]) => {
    await prisma.subcategoryRecommendation.createMany({
      data: ids.map((id) => ({
        sectorId: BigInt(sectorId),
        subsectorId: null,
        subcategoryId: BigInt(id),
        status: SubcategoryRecommendationStatus.ACTIVE,
        createdById: testUser.id,
      })),
    });
  };

  describe("Diff operations", () => {
    it("add-only: should add new subcategories to existing group", async () => {
      await seedActive([subcategoryIds[0]]);

      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[0], subcategoryIds[1]] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateSubcategoryRecommendationResponse;
      expect(body.subcategoryIds).toHaveLength(2);
      expect(body.subcategoryIds).toContain(subcategoryIds[0]);
      expect(body.subcategoryIds).toContain(subcategoryIds[1]);
    });

    it("remove-only: should soft-delete removed subcategories", async () => {
      await seedActive([subcategoryIds[0], subcategoryIds[1]]);

      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[0]] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateSubcategoryRecommendationResponse;
      expect(body.subcategoryIds).toHaveLength(1);
      expect(body.subcategoryIds).toContain(subcategoryIds[0]);

      const deleted = await prisma.subcategoryRecommendation.findFirst({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryIds[1]),
          status: SubcategoryRecommendationStatus.DELETED,
          createdById: testUser.id,
        },
        orderBy: { id: "desc" },
      });
      expect(deleted).not.toBeNull();
      expect(deleted!.updatedById).toBe(testUser.id);
    });

    it("mixed diff: should add and remove correctly", async () => {
      await seedActive([subcategoryIds[0], subcategoryIds[1]]);

      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[0], subcategoryIds[2]] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateSubcategoryRecommendationResponse;
      expect(body.subcategoryIds).toHaveLength(2);
      expect(body.subcategoryIds).toContain(subcategoryIds[0]);
      expect(body.subcategoryIds).toContain(subcategoryIds[2]);
      expect(body.subcategoryIds).not.toContain(subcategoryIds[1]);
    });

    it("empty array: should soft-delete all ACTIVE rows", async () => {
      await seedActive([subcategoryIds[0], subcategoryIds[1]]);

      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateSubcategoryRecommendationResponse;
      expect(body.subcategoryIds).toHaveLength(0);

      const activeCount = await prisma.subcategoryRecommendation.count({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      expect(activeCount).toBe(0);

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/subcategory-recommendations",
      });
      const list = JSON.parse(listResponse.body) as Array<{
        sectorId: number;
        subsectorId: number | null;
        subcategoryIds: number[];
      }>;
      const group = list.find(
        (g) => g.sectorId === sectorId && g.subsectorId === null
      );
      expect(group).toBeUndefined();
    });

    it("idempotent: empty PUT on already-empty group succeeds with no state change", async () => {
      const countBefore = await prisma.subcategoryRecommendation.count({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      expect(countBefore).toBe(0);

      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [] },
      });

      expect(response.statusCode).toBe(200);

      const countAfter = await prisma.subcategoryRecommendation.count({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      expect(countAfter).toBe(0);
    });

    it("delete-then-readd: re-adding a previously DELETED tuple creates a new ACTIVE row", async () => {
      await seedActive([subcategoryIds[0]]);

      // Delete it via PUT []
      await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [] },
      });

      // Re-add via PUT
      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[0]] },
      });

      expect(response.statusCode).toBe(200);

      const activeCount = await prisma.subcategoryRecommendation.count({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryIds[0]),
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      });
      expect(activeCount).toBe(1);
    });
  });

  describe("Audit fields", () => {
    it("should set createdById on new rows and updatedById on soft-deletes", async () => {
      await seedActive([subcategoryIds[0]]);

      await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[0], subcategoryIds[1]] },
      });

      const newRow = await prisma.subcategoryRecommendation.findFirst({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryIds[1]),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
        orderBy: { id: "desc" },
      });
      expect(newRow).not.toBeNull();
      expect(newRow!.createdById).toBe(testUser.id);

      await app.inject({
        method: "PUT",
        url: url(),
        payload: { subcategoryIds: [subcategoryIds[1]] },
      });

      const softDeleted = await prisma.subcategoryRecommendation.findFirst({
        where: {
          sectorId: BigInt(sectorId),
          subsectorId: null,
          subcategoryId: BigInt(subcategoryIds[0]),
          status: SubcategoryRecommendationStatus.DELETED,
          createdById: testUser.id,
        },
        orderBy: { id: "desc" },
      });
      expect(softDeleted).not.toBeNull();
      expect(softDeleted!.updatedById).toBe(testUser.id);
    });
  });

  describe("Validation — 400", () => {
    it("should return 400 for duplicate subcategoryIds", async () => {
      const response = await app.inject({
        method: "PUT",
        url: url(),
        payload: {
          subcategoryIds: [subcategoryIds[0], subcategoryIds[0]],
        },
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
          method: "PUT",
          url: url(),
          payload: { subcategoryIds: [] },
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
