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
import type { FastifyInstance } from "fastify";
import {
  MethodologyVersionStatus,
  ReductionPlanInitiativeStatus,
  type PrismaClient,
} from "@repo/database";

describe("POST /api/admin/reduction-plan - Integration Tests", () => {
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

  const createSubcategory = async (nameTag: string) => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${nameTag} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id);
    return createTestSubcategory(prisma, category.id);
  };

  describe("Successful creation", () => {
    it("should create an initiative and return 201 with its id", async () => {
      const subcategory = await createSubcategory("Create OK");

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Reciclaje en oficina",
          description: "Programa interno de reciclaje",
          subcategoryId: subcategory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { id: string };
      expect(body.id).toBeDefined();

      const dbRecord = await prisma.reductionPlanInitiative.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.status).toBe(ReductionPlanInitiativeStatus.ACTIVE);
      expect(dbRecord!.title).toBe("Reciclaje en oficina");
    });

    it("should allow the same title in a different subcategory", async () => {
      const subA = await createSubcategory("Same Title A");
      const subB = await createSubcategory("Same Title B");

      const first = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Iniciativa duplicable",
          description: "Primera",
          subcategoryId: subA.id.toString(),
        },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Iniciativa duplicable",
          description: "Segunda",
          subcategoryId: subB.id.toString(),
        },
      });
      expect(second.statusCode).toBe(201);
    });

    it("should allow reusing a title after the previous initiative is soft-deleted", async () => {
      const subcategory = await createSubcategory("Reuse After Delete");

      const first = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Reusable",
          description: "Primera",
          subcategoryId: subcategory.id.toString(),
        },
      });
      expect(first.statusCode).toBe(201);
      const firstId = (JSON.parse(first.body) as { id: string }).id;

      await prisma.reductionPlanInitiative.update({
        where: { id: BigInt(firstId) },
        data: { status: ReductionPlanInitiativeStatus.DELETED },
      });

      const second = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Reusable",
          description: "Segunda",
          subcategoryId: subcategory.id.toString(),
        },
      });
      expect(second.statusCode).toBe(201);
    });
  });

  describe("Error handling", () => {
    it("should return 409 with REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS when an active duplicate exists", async () => {
      const subcategory = await createSubcategory("Duplicate Title");

      const first = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Duplicada",
          description: "Primera",
          subcategoryId: subcategory.id.toString(),
        },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Duplicada",
          description: "Segunda",
          subcategoryId: subcategory.id.toString(),
        },
      });

      expect(second.statusCode).toBe(409);
      const body = JSON.parse(second.body) as { code: string };
      expect(body.code).toBe("REDUCTION_PLAN_INITIATIVE_TITLE_ALREADY_EXISTS");
    });

    it("should return 404 when the subcategory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/reduction-plan",
        payload: {
          title: "Cualquiera",
          description: "Cualquiera",
          subcategoryId: "999999999",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe(
        "SUBCATEGORY_NOT_FOUND_FOR_REDUCTION_PLAN_INITIATIVE"
      );
    });
  });
});
