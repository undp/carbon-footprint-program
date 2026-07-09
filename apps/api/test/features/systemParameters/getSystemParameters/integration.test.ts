import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  type GetSystemParametersResponse,
  SystemParameterKeyEnum,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/system-parameters - Integration Tests", () => {
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

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("Successful retrieval", () => {
    it("should return 200 and at least 1 system parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-parameters",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it("should return items with key, value and numeric bounds fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-parameters",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;

      for (const param of body) {
        expect(Object.keys(param).sort()).toEqual(
          ["key", "maxValue", "minValue", "value"].sort()
        );
        expect(typeof param.key).toBe("string");
        expect(typeof param.value).toBe("string");
        expect(
          param.minValue === null || typeof param.minValue === "number"
        ).toBe(true);
        expect(
          param.maxValue === null || typeof param.maxValue === "number"
        ).toBe(true);
      }
    });

    it("should expose min=1 for MEASURING_ORGANIZATIONS_YEAR_RANGE", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/system-parameters?keys=${SystemParameterKeyEnum.MEASURING_ORGANIZATIONS_YEAR_RANGE}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      expect(body).toHaveLength(1);
      expect(body[0].minValue).toBe(1);
      expect(body[0].maxValue).toBeNull();
    });
  });

  describe("Query filtering", () => {
    it("should filter by a single key", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/system-parameters?keys=${SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      expect(body).toHaveLength(1);
      expect(body[0].key).toBe(
        SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
      );
    });

    it("should return only matching keys when filtering by multiple keys", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/system-parameters?keys=${SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR},NONEXISTENT_KEY`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      expect(body).toHaveLength(1);
      expect(body[0].key).toBe(
        SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
      );
    });

    it("should return empty array for nonexistent key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-parameters?keys=NONEXISTENT_KEY",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      expect(body).toHaveLength(0);
    });
  });

  describe("Ordering", () => {
    it("should return parameters ordered alphabetically by key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-parameters",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      const keys = body.map((p) => p.key);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });

  describe("Data integrity", () => {
    it("should have unique keys", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-parameters",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSystemParametersResponse;
      const keys = body.map((p) => p.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
