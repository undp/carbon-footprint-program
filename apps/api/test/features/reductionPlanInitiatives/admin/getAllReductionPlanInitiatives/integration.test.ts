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
  type Subcategory,
} from "@repo/database";
import type { GetAllReductionPlanInitiativesResponse } from "@repo/types";

describe("GET /api/admin/reduction-plan - Integration Tests", () => {
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

  const createSubcategory = async (
    nameTag: string
  ): Promise<{ subcategory: Subcategory; methodologyVersionId: bigint }> => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${nameTag} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id);
    const subcategory = await createTestSubcategory(prisma, category.id);
    return { subcategory, methodologyVersionId: methodology.id };
  };

  const createInitiative = async (
    subcategoryId: bigint,
    title: string,
    updatedAt: Date | null,
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
        updatedAt,
      },
    });

  it("returns all active initiatives when no methodologyVersionId is provided", async () => {
    const { subcategory: subA } = await createSubcategory("No Filter A");
    const { subcategory: subB } = await createSubcategory("No Filter B");

    const withUpdatedAt = await createInitiative(
      subA.id,
      "Con fecha de actualizacion",
      new Date()
    );
    const withoutUpdatedAt = await createInitiative(
      subA.id,
      "Sin fecha de actualizacion",
      null
    );
    const otherMethodology = await createInitiative(
      subB.id,
      "Otra metodologia",
      null
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/reduction-plan",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllReductionPlanInitiativesResponse;

    const ids = body.map((row) => row.id);
    expect(ids).toContain(withUpdatedAt.id.toString());
    expect(ids).toContain(withoutUpdatedAt.id.toString());
    expect(ids).toContain(otherMethodology.id.toString());

    const withUpdatedAtRow = body.find(
      (row) => row.id === withUpdatedAt.id.toString()
    )!;
    expect(typeof withUpdatedAtRow.updatedAt).toBe("string");

    const withoutUpdatedAtRow = body.find(
      (row) => row.id === withoutUpdatedAt.id.toString()
    )!;
    expect(withoutUpdatedAtRow.updatedAt).toBeNull();
  });

  it("filters initiatives by methodologyVersionId when provided", async () => {
    const { subcategory: subA, methodologyVersionId: methodologyAId } =
      await createSubcategory("Filter A");
    const { subcategory: subB } = await createSubcategory("Filter B");

    const inMethodologyA1 = await createInitiative(
      subA.id,
      "Iniciativa A con fecha",
      new Date()
    );
    const inMethodologyA2 = await createInitiative(
      subA.id,
      "Iniciativa A sin fecha",
      null
    );
    const inMethodologyB = await createInitiative(
      subB.id,
      "Iniciativa B",
      null
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/admin/reduction-plan?methodologyVersionId=${methodologyAId.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllReductionPlanInitiativesResponse;

    const ids = body.map((row) => row.id);
    expect(ids).toContain(inMethodologyA1.id.toString());
    expect(ids).toContain(inMethodologyA2.id.toString());
    expect(ids).not.toContain(inMethodologyB.id.toString());

    const withUpdatedAtRow = body.find(
      (row) => row.id === inMethodologyA1.id.toString()
    )!;
    expect(typeof withUpdatedAtRow.updatedAt).toBe("string");

    const withoutUpdatedAtRow = body.find(
      (row) => row.id === inMethodologyA2.id.toString()
    )!;
    expect(withoutUpdatedAtRow.updatedAt).toBeNull();
  });
});
