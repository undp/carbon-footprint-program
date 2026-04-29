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

type SeededRefs = {
  sectorId: bigint;
  subsectorId: bigint;
  methodologyId: bigint;
  subcategoryIds: bigint[];
  otherMethodologyId: bigint;
  otherSubcategoryId: bigint;
};

const URL = "/api/subcategory-recommendations";

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
    take: 4,
    orderBy: { id: "asc" },
    include: { category: true },
  });
  const methodologyId = subcategories[0].category.methodologyVersionId;

  const otherMethodology = await prisma.methodologyVersion.create({
    data: {
      countryId: country.id,
      name: `Other Methodology ${Date.now()}`,
      description: "Other",
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

describe("PUT /api/subcategory-recommendations - Integration", () => {
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

  const seedActive = async (ids: bigint[]) => {
    await prisma.subcategoryRecommendation.createMany({
      data: ids.map((id) => ({
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: id,
        status: SubcategoryRecommendationStatus.ACTIVE,
      })),
    });
  };

  const groupPayload = (
    methodologyId: bigint,
    sectorId: bigint,
    subsectorId: bigint | null,
    subcategoryIds: string[]
  ) => ({
    methodologyId: methodologyId.toString(),
    sectorId: sectorId.toString(),
    subsectorId: subsectorId !== null ? subsectorId.toString() : null,
    subcategoryIds,
  });

  it("add-only diff creates new ACTIVE rows without touching existing", async () => {
    refs = await seed(prisma);
    await seedActive([refs.subcategoryIds[0]]);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [refs.subcategoryIds[0].toString(), refs.subcategoryIds[1].toString()]
      ),
    });
    expect(response.statusCode).toBe(200);

    const rows = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(rows).toHaveLength(2);
    const newRow = rows.find((r) => r.subcategoryId === refs.subcategoryIds[1]);
    expect(newRow?.createdById).toBe(testUser.id);
  });

  it("remove-only diff soft-deletes removed rows with updatedById", async () => {
    refs = await seed(prisma);
    await seedActive([refs.subcategoryIds[0], refs.subcategoryIds[1]]);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [refs.subcategoryIds[0].toString()]
      ),
    });
    expect(response.statusCode).toBe(200);

    const active = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(active).toHaveLength(1);
    expect(active[0].subcategoryId).toBe(refs.subcategoryIds[0]);

    const deleted = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.DELETED,
      },
    });
    expect(deleted).toHaveLength(1);
    expect(deleted[0].subcategoryId).toBe(refs.subcategoryIds[1]);
    expect(deleted[0].updatedById).toBe(testUser.id);
  });

  it("mixed diff removes old, keeps unchanged, adds new", async () => {
    refs = await seed(prisma);
    await seedActive([refs.subcategoryIds[0], refs.subcategoryIds[1]]);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [refs.subcategoryIds[0].toString(), refs.subcategoryIds[2].toString()]
      ),
    });
    expect(response.statusCode).toBe(200);

    const active = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(active.map((r) => r.subcategoryId).sort()).toEqual(
      [refs.subcategoryIds[0], refs.subcategoryIds[2]].sort()
    );
  });

  it("only affects rows of the requested methodology", async () => {
    refs = await seed(prisma);
    // Same (sector, subsector) but different methodology
    await prisma.subcategoryRecommendation.create({
      data: {
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: refs.otherSubcategoryId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    await seedActive([refs.subcategoryIds[0]]);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        []
      ),
    });
    expect(response.statusCode).toBe(200);

    const otherActive = await prisma.subcategoryRecommendation.findFirst({
      where: {
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: refs.otherSubcategoryId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(otherActive).not.toBeNull();
  });

  it("rejects subcategoryIds that do not belong to the given methodology", async () => {
    refs = await seed(prisma);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [refs.otherSubcategoryId.toString()]
      ),
    });
    expect(response.statusCode).toBe(500);
  });

  it("empty subcategoryIds soft-deletes the entire group (idempotent)", async () => {
    refs = await seed(prisma);
    await seedActive([refs.subcategoryIds[0], refs.subcategoryIds[1]]);

    let response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        []
      ),
    });
    expect(response.statusCode).toBe(200);

    let active = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(active).toHaveLength(0);

    // Second idempotent call on already-empty group
    response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        []
      ),
    });
    expect(response.statusCode).toBe(200);

    active = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(active).toHaveLength(0);
  });

  it("previously DELETED tuple does not block re-insertion", async () => {
    refs = await seed(prisma);
    await prisma.subcategoryRecommendation.create({
      data: {
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: refs.subcategoryIds[0],
        status: SubcategoryRecommendationStatus.DELETED,
      },
    });

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [refs.subcategoryIds[0].toString()]
      ),
    });
    expect(response.statusCode).toBe(200);

    const all = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        subsectorId: refs.subsectorId,
        subcategoryId: refs.subcategoryIds[0],
      },
    });
    const active = all.filter(
      (r) => r.status === SubcategoryRecommendationStatus.ACTIVE
    );
    const deleted = all.filter(
      (r) => r.status === SubcategoryRecommendationStatus.DELETED
    );
    expect(active).toHaveLength(1);
    expect(deleted).toHaveLength(1);
  });

  it("returns 400 on duplicate subcategoryIds", async () => {
    refs = await seed(prisma);
    const dup = refs.subcategoryIds[0].toString();
    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(
        refs.methodologyId,
        refs.sectorId,
        refs.subsectorId,
        [dup, dup]
      ),
    });
    expect(response.statusCode).toBe(400);
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
        method: "PUT",
        url: URL,
        payload: groupPayload(
          refs.methodologyId,
          refs.sectorId,
          refs.subsectorId,
          [refs.subcategoryIds[0].toString()]
        ),
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });

  it("accepts subsectorId as null (no-subsector group)", async () => {
    refs = await seed(prisma);

    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: groupPayload(refs.methodologyId, refs.sectorId, null, [
        refs.subcategoryIds[0].toString(),
      ]),
    });
    expect(response.statusCode).toBe(200);

    const rows = await prisma.subcategoryRecommendation.findMany({
      where: {
        sectorId: refs.sectorId,
        subsectorId: null,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });
    expect(rows).toHaveLength(1);
  });

  it("rejects non-numeric subsectorId with 400", async () => {
    refs = await seed(prisma);
    const response = await app.inject({
      method: "PUT",
      url: URL,
      payload: {
        methodologyId: refs.methodologyId.toString(),
        sectorId: refs.sectorId.toString(),
        subsectorId: "not-a-number",
        subcategoryIds: [refs.subcategoryIds[0].toString()],
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
