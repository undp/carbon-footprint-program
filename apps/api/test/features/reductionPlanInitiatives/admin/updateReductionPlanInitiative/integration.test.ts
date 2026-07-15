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
import { updateReductionPlanInitiativeService } from "@/features/reductionPlanInitiatives/admin/updateReductionPlanInitiative/service.js";
import type { FastifyInstance } from "fastify";
import {
  MethodologyVersionStatus,
  ReductionPlanInitiativeStatus,
  type PrismaClient,
  type Subcategory,
} from "@repo/database";

describe("PATCH /api/admin/reduction-plan/:id - Integration Tests", () => {
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
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  const createSubcategory = async (nameTag: string): Promise<Subcategory> => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${nameTag} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id);
    return createTestSubcategory(prisma, category.id);
  };

  const createInitiative = async (
    subcategoryId: bigint,
    title: string,
    status: ReductionPlanInitiativeStatus = ReductionPlanInitiativeStatus.ACTIVE
  ) =>
    prisma.reductionPlanInitiative.create({
      data: {
        title,
        description: "Test description",
        subcategoryId,
        dimensionValue1Id: null,
        dimensionValue2Id: null,
        status,
        createdById: null,
        updatedById: null,
        updatedAt: null,
      },
    });

  describe("Successful update", () => {
    it("should update title and return 200", async () => {
      const subcategory = await createSubcategory("Update OK");
      const initiative = await createInitiative(subcategory.id, "Original");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
        payload: { title: "Actualizada" },
      });

      expect(response.statusCode).toBe(200);

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: initiative.id },
      });
      expect(dbRecord!.title).toBe("Actualizada");
    });
  });

  describe("Error handling", () => {
    it("should return 409 when renaming would collide with another active initiative in the same subcategory", async () => {
      const subcategory = await createSubcategory("Rename Collision");
      await createInitiative(subcategory.id, "Existente");
      const target = await createInitiative(subcategory.id, "Otra");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${target.id.toString()}`,
        payload: { title: "Existente" },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS");
    });

    it("should return 409 when changing subcategory would collide with an existing active title", async () => {
      const subA = await createSubcategory("Move Source");
      const subB = await createSubcategory("Move Target");
      await createInitiative(subB.id, "Compartida");
      const movable = await createInitiative(subA.id, "Compartida");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${movable.id.toString()}`,
        payload: { subcategoryId: subB.id.toString() },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS");
    });

    it("should allow renaming to a title that previously existed but was soft-deleted", async () => {
      const subcategory = await createSubcategory("Reuse Deleted Title");
      await createInitiative(
        subcategory.id,
        "Reusable",
        ReductionPlanInitiativeStatus.DELETED
      );
      const target = await createInitiative(subcategory.id, "Otra");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${target.id.toString()}`,
        payload: { title: "Reusable" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 404 when the initiative does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/reduction-plan/999999999",
        payload: { title: "Cualquiera" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_NOT_FOUND");
    });

    it("should return 404 when the target subcategory does not exist", async () => {
      const subcategory = await createSubcategory("Move Bad Target");
      const initiative = await createInitiative(subcategory.id, "Original");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
        payload: { subcategoryId: "999999999" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe(
        "SUBCATEGORY_NOT_FOUND_FOR_REDUCTION_PLAN_INITIATIVE"
      );
    });
  });

  describe("Additional field updates", () => {
    it("should update the description only", async () => {
      const subcategory = await createSubcategory("Update Description");
      const initiative = await createInitiative(subcategory.id, "Original");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/reduction-plan/${initiative.id.toString()}`,
        payload: { description: "Nueva descripción" },
      });

      expect(response.statusCode).toBe(200);

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: initiative.id },
      });
      expect(dbRecord!.description).toBe("Nueva descripción");
    });
  });

  describe("Direct service invocation (bypassing schema-level validation)", () => {
    // This route always runs behind auth (`access: { mode: "private" }`), so
    // `request.currentUser` is never null over HTTP. Call the service
    // directly with `user = null` to exercise the
    // `user ? BigInt(user.id) : null` false branch.
    it("should set updatedById to null when no user is provided", async () => {
      const subcategory = await createSubcategory("Direct No User");
      const initiative = await createInitiative(subcategory.id, "Original");

      await updateReductionPlanInitiativeService(
        prisma,
        initiative.id.toString(),
        { title: "Actualizado sin usuario" },
        null
      );

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: initiative.id },
      });
      expect(dbRecord!.title).toBe("Actualizado sin usuario");
      expect(dbRecord!.updatedById).toBeNull();
    });
  });
});
