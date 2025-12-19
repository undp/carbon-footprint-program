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

describe("GET /api/country-sectors - Subsectors Integration Tests", () => {
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
    it("should return exactly 143 subsectors across all sectors", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const totalSubsectors = body.reduce(
        (acc, sector) => acc + sector.subsectors.length,
        0
      );
      expect(totalSubsectors).toBe(143);
    });

    it("should return subsectors with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const energySector = body.find((s) => s.name === "Energía");
      expect(energySector).toBeDefined();

      const solarSubsector = energySector!.subsectors.find((sub) =>
        sub.name.includes("Renovable")
      );
      expect(solarSubsector).toBeDefined();
      expect(solarSubsector!.name).toBe(
        "Generación de Energía - Renovable (solar, eólica, hidro, biomasa)"
      );
    });
  });

  describe("Subsector categories per sector", () => {
    it("should return correct subsector count per sector", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const expectedCounts: Record<string, number> = {
        "Manufactura / Industria Manufacturera": 22,
        Energía: 8,
        "Agricultura, Ganadería, Silvicultura y Pesca": 15,
        Construcción: 10,
        "Transporte y Logística": 11,
        Comercio: 7,
        "Servicios Financieros": 9,
        "Turismo, Hotelería y Restaurantes": 10,
        Salud: 9,
        Educación: 6,
        "Servicios Profesionales y Empresariales": 10,
        "Administración Pública": 4,
        Minería: 7,
        Telecomunicaciones: 4,
        "Bienes Raíces": 4,
        "Gestión de Residuos": 4,
        "Agua y Saneamiento": 3,
      };

      Object.entries(expectedCounts).forEach(([sectorName, expectedCount]) => {
        const sector = body.find((s) => s.name === sectorName);
        expect(sector).toBeDefined();
        expect(sector!.subsectors.length).toBe(expectedCount);
      });
    });

    it("should return expected subsectors for Energía sector", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const energySector = body.find((s) => s.name === "Energía");
      expect(energySector).toBeDefined();

      const expectedSubsectors = [
        "Comercialización de Energía",
        "Distribución y Transmisión",
        "Generación de Energía - Renovable (solar, eólica, hidro, biomasa)",
        "Generación de Energía - Termoeléctrica",
        "Petróleo y Gas - Exploración",
        "Petróleo y Gas - Producción",
        "Petróleo y Gas - Refinería",
      ];

      expectedSubsectors.forEach((expectedName) => {
        const found = energySector?.subsectors.find(
          (sub) => sub.name === expectedName
        );
        expect(found).toBeDefined();
      });
    });
  });

  describe("Ordering", () => {
    it("should return subsectors ordered by name within each sector", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      body.forEach((sector) => {
        const names = sector.subsectors.map((sub) => sub.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      });
    });
  });

  describe("Data integrity", () => {
    it("should have unique subsector IDs across all sectors", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      const allSubsectorIds = body.flatMap((sector) =>
        sector.subsectors.map((sub) => sub.id)
      );
      const uniqueIds = new Set(allSubsectorIds);

      expect(uniqueIds.size).toBe(allSubsectorIds.length);
    });

    it("should have unique subsector names within each sector", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      body.forEach((sector) => {
        const names = sector.subsectors.map((sub) => sub.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });
    });

    it("should have all sectors containing at least one subsector", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;

      body.forEach((sector) => {
        expect(sector.subsectors.length).toBeGreaterThan(0);
      });
    });
  });
});
