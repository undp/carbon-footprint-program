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
import type { PrismaClient, User } from "@repo/database";
import {
  SystemRole,
  SubcategoryRecommendationStatus,
  MethodologyVersionStatus,
} from "@repo/database/enums";
import type { GetAllSubcategoryRecommendationsResponse } from "@repo/types";

type SeededRefs = {
  countryId: bigint;
  sectorId: bigint;
  subsectorId: bigint;
  methodologyId: bigint;
  subcategoryIds: bigint[];
  otherMethodologyId: bigint;
  otherSubcategoryId: bigint;
};

const seed = async (prisma: PrismaClient): Promise<SeededRefs> => {
  const country = await prisma.country.findFirstOrThrow({
    orderBy: { id: "asc" },
  });

  const sector = await prisma.countrySector.create({
    data: {
      countryId: country.id,
      name: `Test Sector ${Date.now()}`,
    },
  });

  const subsector = await prisma.countrySubsector.create({
    data: {
      countrySectorId: sector.id,
      name: `Test Subsector ${Date.now()}`,
    },
  });

  const subcategories = await prisma.subcategory.findMany({
    take: 3,
    orderBy: { id: "asc" },
    include: { category: true },
  });
  const methodologyId = subcategories[0].category.methodologyVersionId;

  const otherMethodology = await prisma.methodologyVersion.create({
    data: {
      countryId: country.id,
      name: `Other Methodology ${Date.now()}`,
      description: "Other methodology for tests",
      regulation: "TEST",
      version: "1.0.0",
      status: MethodologyVersionStatus.UNPUBLISHED,
    },
  });
  const otherCategory = await prisma.category.create({
    data: {
      methodologyVersionId: otherMethodology.id,
      name: `Other Category ${Date.now()}`,
      icon: "icon",
      color: "#000",
      synonyms: "",
      description: "",
      position: 1,
    },
  });
  const otherSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: otherCategory.id,
      name: `Other Subcategory ${Date.now()}`,
      icon: "icon",
      description: "",
    },
  });

  return {
    countryId: country.id,
    sectorId: sector.id,
    subsectorId: subsector.id,
    methodologyId,
    subcategoryIds: subcategories.map((s) => s.id),
    otherMethodologyId: otherMethodology.id,
    otherSubcategoryId: otherSubcategory.id,
  };
};

const cleanup = async (prisma: PrismaClient, refs: SeededRefs) => {
  await prisma.subcategoryRecommendation.deleteMany({
    where: { sectorId: refs.sectorId },
  });
  await prisma.countrySubsector.deleteMany({
    where: { countrySectorId: refs.sectorId },
  });
  await prisma.countrySector.deleteMany({ where: { id: refs.sectorId } });
  await prisma.subcategory.deleteMany({
    where: { id: refs.otherSubcategoryId },
  });
  await prisma.category.deleteMany({
    where: { methodologyVersionId: refs.otherMethodologyId },
  });
  await prisma.methodologyVersion.deleteMany({
    where: { id: refs.otherMethodologyId },
  });
};

describe("GET /api/subcategory-recommendations - Integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let refs: SeededRefs;

  afterEach(async () => {
    if (refs) {
      await cleanup(prisma, refs);
    }
  });

  it("returns 400 when methodologyId is missing", async () => {
    refs = await seed(prisma);
    const response = await app.inject({
      method: "GET",
      url: "/api/subcategory-recommendations",
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns ACTIVE rows scoped to the requested methodology", async () => {
    refs = await seed(prisma);

    await prisma.subcategoryRecommendation.createMany({
      data: [
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.subcategoryIds[0],
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.subcategoryIds[1],
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
        // DELETED row must be excluded
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.subcategoryIds[2],
          status: SubcategoryRecommendationStatus.DELETED,
        },
        // Same (sector, subsector) but in another methodology — must NOT leak
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.otherSubcategoryId,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/subcategory-recommendations?methodologyId=${refs.methodologyId.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllSubcategoryRecommendationsResponse;
    const group = body.find(
      (g) =>
        g.sectorId === refs.sectorId.toString() &&
        g.subsectorId === refs.subsectorId.toString()
    );
    expect(group).toBeDefined();
    expect(group!.subcategoryIds).toHaveLength(2);
    expect(group!.subcategoryIds).toEqual(
      expect.arrayContaining([
        refs.subcategoryIds[0].toString(),
        refs.subcategoryIds[1].toString(),
      ])
    );
    expect(group!.subcategoryIds).not.toContain(
      refs.subcategoryIds[2].toString()
    );
    expect(group!.subcategoryIds).not.toContain(
      refs.otherSubcategoryId.toString()
    );
  });

  it("scopes results to the other methodology when requested", async () => {
    refs = await seed(prisma);

    await prisma.subcategoryRecommendation.createMany({
      data: [
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.subcategoryIds[0],
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
        {
          sectorId: refs.sectorId,
          subsectorId: refs.subsectorId,
          subcategoryId: refs.otherSubcategoryId,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/subcategory-recommendations?methodologyId=${refs.otherMethodologyId.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllSubcategoryRecommendationsResponse;
    const group = body.find(
      (g) =>
        g.sectorId === refs.sectorId.toString() &&
        g.subsectorId === refs.subsectorId.toString()
    );
    expect(group).toBeDefined();
    expect(group!.subcategoryIds).toEqual([refs.otherSubcategoryId.toString()]);
  });

  it("returns 403 for non-admin users", async () => {
    refs = await seed(prisma);
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "GET",
        url: `/api/subcategory-recommendations?methodologyId=${refs.methodologyId.toString()}`,
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
