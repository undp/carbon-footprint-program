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
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import type { GetAllCountrySectorsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";

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

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("Sectors - Successful retrieval", () => {
    it("should return exactly 18 country sectors", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      expect(body).toHaveLength(18);
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

  describe("Sectors - Categories", () => {
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

  describe("Sectors - Ordering", () => {
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

  describe("Sectors - Data integrity", () => {
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

  describe("Subsectors - Successful retrieval", () => {
    it("should return exactly 150 subsectors across all sectors", async () => {
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
      expect(totalSubsectors).toBe(150);
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

  describe("Subsectors - Categories per sector", () => {
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

  describe("Subsectors - Ordering", () => {
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

  describe("Soft-delete filter (smoke)", () => {
    const PUBLIC_PREFIX = "Test - PublicSec ";

    afterEach(async () => {
      await prisma.countrySubsector.deleteMany({
        where: { name: { startsWith: PUBLIC_PREFIX } },
      });
      await prisma.countrySector.deleteMany({
        where: { name: { startsWith: PUBLIC_PREFIX } },
      });
    });

    it("excludes DELETED sectors and DELETED nested subsectors from the public response", async () => {
      const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const deletedSector = await createTestCountrySector(prisma, {
        name: `${PUBLIC_PREFIX}DeletedSector ${random}`,
        status: CountrySectorStatus.DELETED,
      });
      // Attach an ACTIVE subsector under the DELETED sector to ensure the
      // assertion below isn't a false positive — the public endpoint must
      // skip the parent sector even when it has live children.
      const activeSubsectorOfDeletedSector = await createTestCountrySubsector(
        prisma,
        deletedSector.id,
        {
          name: `${PUBLIC_PREFIX}ActiveSubOfDeleted ${random}`,
        }
      );
      const activeSector = await createTestCountrySector(prisma, {
        name: `${PUBLIC_PREFIX}ActiveSector ${random}`,
      });
      const deletedSubsector = await createTestCountrySubsector(
        prisma,
        activeSector.id,
        {
          name: `${PUBLIC_PREFIX}DeletedSub ${random}`,
          status: CountrySubsectorStatus.DELETED,
        }
      );
      const activeSubsector = await createTestCountrySubsector(
        prisma,
        activeSector.id,
        {
          name: `${PUBLIC_PREFIX}ActiveSub ${random}`,
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/country-sectors",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCountrySectorsResponse;
      const ids = body.map((s) => s.id);
      expect(ids).toContain(activeSector.id.toString());
      expect(ids).not.toContain(deletedSector.id.toString());
      // The DELETED sector must not surface even though it owns an ACTIVE
      // subsector — the response should never include its subsector either.
      const allSubsectorIds = body.flatMap((s) =>
        s.subsectors.map((sub) => sub.id)
      );
      expect(allSubsectorIds).not.toContain(
        activeSubsectorOfDeletedSector.id.toString()
      );

      const found = body.find((s) => s.id === activeSector.id.toString())!;
      const subIds = found.subsectors.map((sub) => sub.id);
      expect(subIds).toContain(activeSubsector.id.toString());
      expect(subIds).not.toContain(deletedSubsector.id.toString());
    });
  });

  describe("Subsectors - Data integrity", () => {
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
  });
});
