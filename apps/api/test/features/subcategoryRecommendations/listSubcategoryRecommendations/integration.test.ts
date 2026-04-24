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
import type { ListSubcategoryRecommendationsResponse } from "@repo/types";

describe("GET /api/subcategory-recommendations - Integration Tests", () => {
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
    await prisma.subcategoryRecommendation.deleteMany({
      where: { createdById: testUser.id },
    });
  });

  it("should return 200 with only ACTIVE rows grouped", async () => {
    const sector = await prisma.countrySector.findFirst({
      orderBy: { id: "asc" },
    });
    const subcategory = await prisma.subcategory.findFirst({
      orderBy: { id: "asc" },
    });

    if (!sector || !subcategory) return;

    await prisma.subcategoryRecommendation.createMany({
      data: [
        {
          sectorId: sector.id,
          subsectorId: null,
          subcategoryId: subcategory.id,
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
        {
          sectorId: sector.id,
          subsectorId: null,
          subcategoryId: subcategory.id,
          status: SubcategoryRecommendationStatus.DELETED,
          createdById: testUser.id,
        },
      ],
      skipDuplicates: true,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/subcategory-recommendations",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as ListSubcategoryRecommendationsResponse;
    expect(Array.isArray(body)).toBe(true);

    const matchingGroup = body.find(
      (g) =>
        g.sectorId === Number(sector.id) &&
        g.subcategoryIds.includes(Number(subcategory.id))
    );
    expect(matchingGroup).toBeDefined();

    const activeCount = await prisma.subcategoryRecommendation.count({
      where: {
        sectorId: sector.id,
        status: SubcategoryRecommendationStatus.ACTIVE,
        createdById: testUser.id,
      },
    });
    expect(activeCount).toBe(1);
  });

  it("should return 403 for non-admin users", async () => {
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/subcategory-recommendations",
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });

  it("should exclude DELETED rows from grouped response", async () => {
    const sector = await prisma.countrySector.findFirst({
      orderBy: { id: "asc" },
    });
    const subcategories = await prisma.subcategory.findMany({
      take: 2,
      orderBy: { id: "asc" },
    });

    if (!sector || subcategories.length < 2) return;

    await prisma.subcategoryRecommendation.createMany({
      data: [
        {
          sectorId: sector.id,
          subsectorId: null,
          subcategoryId: subcategories[0]!.id,
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: testUser.id,
        },
        {
          sectorId: sector.id,
          subsectorId: null,
          subcategoryId: subcategories[1]!.id,
          status: SubcategoryRecommendationStatus.DELETED,
          createdById: testUser.id,
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/subcategory-recommendations",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as ListSubcategoryRecommendationsResponse;

    const matchingGroup = body.find((g) => g.sectorId === Number(sector.id));
    if (matchingGroup) {
      expect(matchingGroup.subcategoryIds).not.toContain(
        Number(subcategories[1]!.id)
      );
    }
  });
});
