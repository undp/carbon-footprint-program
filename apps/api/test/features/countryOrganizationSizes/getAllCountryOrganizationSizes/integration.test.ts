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
import { createTestCountryOrganizationSize } from "@test/factories/countryOrganizationSizeFactory.js";
import type { GetAllCountryOrganizationSizesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";

describe("GET /api/country-organization-sizes - Integration Tests", () => {
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
    it("should return exactly 8 country organization sizes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;
      expect(body).toHaveLength(8);
    });

    it("should return country organization sizes with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;

      const testOrgSize = body.find((os) =>
        os.name.includes("Microempresa (1-10 empleados)")
      );
      expect(testOrgSize).toBeDefined();
      expect(testOrgSize!.name).toBe("Microempresa (1-10 empleados)");
    });
  });

  describe("Organization size categories", () => {
    it("should return all expected organization size categories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;

      const expectedNames = [
        "Microempresa (1-10 empleados)",
        "Pequeña empresa (11-49 empleados)",
        "Mediana empresa I (50-99 empleados)",
        "Mediana empresa II (100-249 empleados)",
        "Gran empresa (250-499 empleados)",
        "Empresa muy grande (500-999 empleados)",
        "Corporación grande (1000-4999 empleados)",
        "Corporación multinacional (5000+ empleados)",
      ];

      expectedNames.forEach((expectedName) => {
        const found = body.find((os) => os.name === expectedName);
        expect(found).toBeDefined();
      });
    });
  });

  describe("Ordering", () => {
    it("should return organization sizes ordered by id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;
      const ids = body.map((os) => Number(os.id));
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });
  });

  describe("Soft-delete filter (smoke)", () => {
    const PUBLIC_PREFIX = "Test - PublicSize ";

    afterEach(async () => {
      await prisma.countryOrganizationSize.deleteMany({
        where: { name: { startsWith: PUBLIC_PREFIX } },
      });
    });

    it("excludes DELETED sizes from the public response", async () => {
      const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const active = await createTestCountryOrganizationSize(prisma, {
        name: `${PUBLIC_PREFIX}Active ${random}`,
      });
      const deleted = await createTestCountryOrganizationSize(prisma, {
        name: `${PUBLIC_PREFIX}Deleted ${random}`,
        status: CountryOrganizationSizeStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;
      const ids = body.map((os) => os.id);
      expect(ids).toContain(active.id.toString());
      expect(ids).not.toContain(deleted.id.toString());
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;
      const ids = body.map((os) => os.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique names", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-organization-sizes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllCountryOrganizationSizesResponse;
      const names = body.map((os) => os.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
