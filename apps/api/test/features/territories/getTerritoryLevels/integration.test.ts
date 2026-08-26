import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, TerritoryLevel } from "@repo/database";
import type { GetTerritoryLevelsResponse } from "@repo/types";

/**
 * Reads the hierarchy the migration loads, rather than creating rows: the
 * endpoint exists to report which levels that catalog actually holds.
 *
 * The organization form renders one selector per level returned, so these
 * assertions are what keeps a level nobody has data for from becoming a control
 * the registrant can never fill, and what keeps a level that lands later from
 * needing a code change to appear.
 */
describe("GET /api/territories/levels - Integration Tests", () => {
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

  const getLevels = async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/territories/levels",
    });
    return {
      statusCode: response.statusCode,
      body: JSON.parse(response.body) as GetTerritoryLevelsResponse,
    };
  };

  it("returns the three levels article 7 of Ley 345-22 supplies", async () => {
    const { statusCode, body } = await getLevels();

    expect(statusCode).toBe(200);
    expect(body).toEqual([
      TerritoryLevel.PLANNING_REGION,
      TerritoryLevel.PROVINCE,
      TerritoryLevel.MUNICIPALITY,
    ]);
  });

  it("omits the levels no official source has been obtained for", async () => {
    // Distritos municipales and parajes wait on the IDE-RD layers. Until they
    // load, the form must not render a selector for them.
    const { body } = await getLevels();

    expect(body).not.toContain(TerritoryLevel.MUNICIPAL_DISTRICT);
    expect(body).not.toContain(TerritoryLevel.SECTOR);
  });

  it("reports exactly the levels that have rows", async () => {
    // Resolved from the database rather than hardcoded, so loading a further
    // level makes this fail here instead of silently in the form.
    const rows = await prisma.territory.findMany({
      distinct: ["level"],
      select: { level: true },
    });
    const withRows = new Set(rows.map((row) => row.level));

    const { body } = await getLevels();

    expect(new Set(body)).toEqual(withRows);
  });

  it("orders the levels outermost first, not alphabetically", async () => {
    // Alphabetical order would put MUNICIPALITY before PLANNING_REGION and
    // PROVINCE, which would invert the selectors: the form maps a level onto its
    // position in `territoryIds` by the order this endpoint returns.
    const { body } = await getLevels();

    const alphabetical = [...body].sort();

    expect(body).not.toEqual(alphabetical);
    expect(body.indexOf(TerritoryLevel.PLANNING_REGION)).toBeLessThan(
      body.indexOf(TerritoryLevel.PROVINCE)
    );
    expect(body.indexOf(TerritoryLevel.PROVINCE)).toBeLessThan(
      body.indexOf(TerritoryLevel.MUNICIPALITY)
    );
  });

  it("is reachable without authentication", async () => {
    // The organization form renders the location section before a registrant
    // has an organization, so the catalog's shape cannot be behind auth.
    const { statusCode } = await getLevels();

    expect(statusCode).toBe(200);
  });
});
