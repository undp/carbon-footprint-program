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
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, CountrySectorStatus } from "@repo/database";
import type { UpdateCountrySectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSecUpd ";

describe("PATCH /api/admin/country-sectors/:id - Integration Tests", () => {
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

  afterEach(async () => {
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  describe("Successful updates", () => {
    it("updates only the name (partial update)", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Old"),
        description: "old desc",
      });
      const newName = uniqueName("New");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.name).toBe(newName);
      expect(body.description).toBe("old desc");
    });

    it("description tri-state: explicit null clears it", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc"),
        description: "some text",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: null },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBeNull();
    });

    it("description tri-state: empty string clears it", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc2"),
        description: "abc",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { description: "" },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBeNull();
    });

    it("description tri-state: omitted leaves the description untouched", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDesc3"),
        description: "preserved",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: uniqueName("OnlyName") },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySectorResponse;
      expect(body.description).toBe("preserved");
    });
  });

  describe("Validation errors", () => {
    it("returns 400 when the body is empty", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("EmptyBody"),
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Conflict and not-found", () => {
    it("returns 404 when sector id does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/country-sectors/9999999999",
        payload: { name: uniqueName("Whatever") },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 409 when renaming into an existing ACTIVE name", async () => {
      const taken = uniqueName("Taken");
      await createTestCountrySector(prisma, { name: taken });
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Other"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: taken },
      });
      expect(response.statusCode).toBe(409);
    });

    it("does not block renaming into a name only used by a DELETED sector", async () => {
      const ghost = uniqueName("Ghost");
      await createTestCountrySector(prisma, {
        name: ghost,
        status: CountrySectorStatus.DELETED,
      });
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Live"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
        payload: { name: ghost },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
