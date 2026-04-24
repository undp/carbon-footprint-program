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
} from "@repo/database/enums";

type SeededRefs = {
  sectorId: bigint;
  subsectorId: bigint;
  subcategoryIds: bigint[];
};

const seed = async (prisma: PrismaClient): Promise<SeededRefs> => {
  const country = await prisma.country.findFirstOrThrow({
    orderBy: { id: "asc" },
  });
  const sector = await prisma.countrySector.create({
    data: { countryId: country.id, name: `Test Sector ${Date.now()}` },
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
  });
  return {
    sectorId: sector.id,
    subsectorId: subsector.id,
    subcategoryIds: subcategories.map((s) => s.id),
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
};

describe("POST /api/subcategory-recommendations - Integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageConnectionString: inject("storageConnectionString"),
      storageContainerName: inject("storageContainerName"),
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
    if (refs) await cleanup(prisma, refs);
  });

  it("creates ACTIVE rows with createdById populated (201)", async () => {
    refs = await seed(prisma);

    const response = await app.inject({
      method: "POST",
      url: "/api/subcategory-recommendations",
      payload: {
        sectorId: refs.sectorId.toString(),
        subsectorId: refs.subsectorId.toString(),
        subcategoryIds: [
          refs.subcategoryIds[0].toString(),
          refs.subcategoryIds[1].toString(),
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const rows = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.createdById).toBe(testUser.id);
    }
  });

  it("returns 409 when an ACTIVE group already exists", async () => {
    refs = await seed(prisma);

    await prisma.subcategoryRecommendation.create({
      data: {
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: refs.subcategoryIds[0],
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/subcategory-recommendations",
      payload: {
        sectorId: refs.sectorId.toString(),
        subsectorId: refs.subsectorId.toString(),
        subcategoryIds: [refs.subcategoryIds[1].toString()],
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("allows creation after a full soft-delete of the same tuple", async () => {
    refs = await seed(prisma);

    await prisma.subcategoryRecommendation.createMany({
      data: refs.subcategoryIds.slice(0, 2).map((id) => ({
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: id,
        status: SubcategoryRecommendationStatus.DELETED,
      })),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/subcategory-recommendations",
      payload: {
        sectorId: refs.sectorId.toString(),
        subsectorId: refs.subsectorId.toString(),
        subcategoryIds: [refs.subcategoryIds[0].toString()],
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("returns 400 on empty subcategoryIds", async () => {
    refs = await seed(prisma);
    const response = await app.inject({
      method: "POST",
      url: "/api/subcategory-recommendations",
      payload: {
        sectorId: refs.sectorId.toString(),
        subsectorId: refs.subsectorId.toString(),
        subcategoryIds: [],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 on duplicate subcategoryIds", async () => {
    refs = await seed(prisma);
    const dup = refs.subcategoryIds[0].toString();
    const response = await app.inject({
      method: "POST",
      url: "/api/subcategory-recommendations",
      payload: {
        sectorId: refs.sectorId.toString(),
        subsectorId: refs.subsectorId.toString(),
        subcategoryIds: [dup, dup],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 403 for non-admin users and makes no changes", async () => {
    refs = await seed(prisma);
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategory-recommendations",
        payload: {
          sectorId: refs.sectorId.toString(),
          subsectorId: refs.subsectorId.toString(),
          subcategoryIds: [refs.subcategoryIds[0].toString()],
        },
      });
      expect(response.statusCode).toBe(403);
      const rows = await prisma.subcategoryRecommendation.findMany({
        where: { sectorId: refs.sectorId },
      });
      expect(rows).toHaveLength(0);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });
});
