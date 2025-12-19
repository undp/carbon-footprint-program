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
import type { GetAllCountrySectorsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/country-sectors - Integration Tests", () => {
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

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("BEGIN");
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe("ROLLBACK");
  });

  describe("Successful retrieval", () => {
    it("should return exactly 17 country sectors", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      expect(body).toHaveLength(17);
    });

    it("should return country sectors with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const testSector = body.find((s) => s.name.includes("Energía"));
      expect(testSector).toBeDefined();
      expect(testSector!.name).toBe("Energía");
    });
  });

  describe("Sector categories", () => {
    it("should return all expected sector categories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const expectedNames = [
        "Administración Pública",
        "Agricultura, Ganadería, Silvicultura y Pesca",
        "Agua y Saneamiento",
        "Bienes Raíces",
        "Comercio",
        "Construcción",
        "Educación",
        "Energía",
        "Gestión de Residuos",
        "Manufactura / Industria Manufacturera",
        "Minería",
        "Salud",
        "Servicios Financieros",
        "Servicios Profesionales y Empresariales",
        "Telecomunicaciones",
        "Transporte y Logística",
        "Turismo, Hotelería y Restaurantes",
      ];

      expectedNames.forEach((expectedName) => {
        const found = body.find((s) => s.name === expectedName);
        expect(found).toBeDefined();
      });
    });
  });

  describe("Ordering", () => {
    it("should return sectors ordered by name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      const names = body.map((s) => s.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      const ids = body.map((s) => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique names", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      const names = body.map((s) => s.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
