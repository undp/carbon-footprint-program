import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, TerritoryLevel } from "@repo/database";
import type { GetAllTerritoriesResponse } from "@repo/types";

/**
 * Reads the hierarchy the migration loads, rather than creating rows: the
 * endpoint exists to walk that catalog, and asserting against it also covers the
 * migration having built the parent links correctly.
 *
 * Assertions are structural wherever they can be. The catalog is real Dominican
 * data pending MMARN validation, so a renamed province must not break the suite;
 * only the four names checked below are load-bearing, and each is fixed by
 * article 7 of Ley 345-22 rather than by a ministry decision.
 */
describe("GET /api/territories - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const getTerritories = async (parentId?: string) => {
    const response = await app.inject({
      method: "GET",
      url: parentId
        ? `/api/territories?parentId=${parentId}`
        : "/api/territories",
    });
    return {
      statusCode: response.statusCode,
      body: JSON.parse(response.body) as GetAllTerritoriesResponse,
    };
  };

  const findByName = async (name: string, level: TerritoryLevel) => {
    const territory = await prisma.territory.findFirstOrThrow({
      where: { name, level },
    });
    return territory.id.toString();
  };

  it("returns the planning regions when parentId is omitted", async () => {
    const { statusCode, body } = await getTerritories();

    expect(statusCode).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((t) => t.level === TerritoryLevel.PLANNING_REGION)).toBe(
      true
    );
    expect(body.map((t) => t.name)).toContain("Cibao Norte");
  });

  it("returns only the children of the given parent", async () => {
    const regionId = await findByName(
      "Cibao Norte",
      TerritoryLevel.PLANNING_REGION
    );

    const { statusCode, body } = await getTerritories(regionId);

    expect(statusCode).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((t) => t.level === TerritoryLevel.PROVINCE)).toBe(true);
    expect(body.map((t) => t.name)).toContain("Santiago");
  });

  it("returns the municipios of a province", async () => {
    const provinceId = await findByName("Santiago", TerritoryLevel.PROVINCE);

    const { statusCode, body } = await getTerritories(provinceId);

    expect(statusCode).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((t) => t.level === TerritoryLevel.MUNICIPALITY)).toBe(
      true
    );
    expect(body.map((t) => t.name)).toContain("Tamboril");
  });

  it("returns an empty list for a leaf instead of a 404", async () => {
    // Municipios are the innermost level authored so far: the two below them
    // wait on the IDE-RD layers, and the endpoint must not treat that as an
    // error. Resolved structurally so a municipio MMARN renames does not break
    // the assertion.
    const leaf = await prisma.territory.findFirstOrThrow({
      where: { level: TerritoryLevel.MUNICIPALITY },
    });

    const { statusCode, body } = await getTerritories(leaf.id.toString());

    expect(statusCode).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns an empty list for a province the law gives no municipios", async () => {
    // The Distrito Nacional is itself the municipal level, so it branches no
    // further. The form has to render its municipio selector empty rather than
    // treat the province as unanswered.
    const districtId = await findByName(
      "Distrito Nacional",
      TerritoryLevel.PROVINCE
    );

    const { statusCode, body } = await getTerritories(districtId);

    expect(statusCode).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns 400 for a non-numeric parentId", async () => {
    const { statusCode } = await getTerritories("not-an-id");

    expect(statusCode).toBe(400);
  });
});
