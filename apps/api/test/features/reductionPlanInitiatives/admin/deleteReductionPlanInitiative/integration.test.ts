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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  MethodologyVersionStatus,
  ReductionPlanInitiativeStatus,
  type PrismaClient,
  type User,
} from "@repo/database";

describe("DELETE /api/admin/reduction-plan/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  const createInitiative = async (
    status: ReductionPlanInitiativeStatus = ReductionPlanInitiativeStatus.ACTIVE,
    nameTag = "Initiative"
  ) => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${nameTag} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id);
    const subcategory = await createTestSubcategory(prisma, category.id);

    return prisma.reductionPlanInitiative.create({
      data: {
        title: `Test Initiative ${Date.now()}`,
        description: "Integration test initiative",
        subcategoryId: subcategory.id,
        dimensionValue1Id: null,
        dimensionValue2Id: null,
        status,
        createdById: null,
        updatedById: null,
        updatedAt: null,
      },
    });
  };

  describe("Successful deletion", () => {
    it("should soft-delete an ACTIVE initiative and return 200", async () => {
      const initiative = await createInitiative(
        ReductionPlanInitiativeStatus.ACTIVE,
        "Delete Active"
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({});
    });

    it("should set status to DELETED and updatedById to the caller in the database", async () => {
      const initiative = await createInitiative(
        ReductionPlanInitiativeStatus.ACTIVE,
        "Delete DB Verify"
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: initiative.id },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.status).toBe(ReductionPlanInitiativeStatus.DELETED);
      expect(dbRecord!.updatedById).toBe(testUser.id);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when initiative does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/admin/reduction-plan/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_NOT_FOUND");
    });

    it("should return 404 when initiative is already DELETED", async () => {
      const initiative = await createInitiative(
        ReductionPlanInitiativeStatus.DELETED,
        "Already Deleted"
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_NOT_FOUND");
    });

    it("should not modify the record when the delete fails with 404 on an already-DELETED initiative", async () => {
      const initiative = await createInitiative(
        ReductionPlanInitiativeStatus.DELETED,
        "No Modify On 404"
      );

      await app.inject({
        method: "DELETE",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
      });

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: initiative.id },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.status).toBe(ReductionPlanInitiativeStatus.DELETED);
      expect(dbRecord!.updatedById).toBeNull();
      expect(dbRecord!.updatedAt).toBeNull();
    });
  });
});
