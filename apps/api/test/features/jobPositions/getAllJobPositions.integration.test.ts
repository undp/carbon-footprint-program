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
import type { GetAllJobPositionsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/job-positions - Integration Tests", () => {
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
    it("should return exactly 78 job positions", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;
      expect(body).toHaveLength(78);
    });

    it("should return job positions with valid structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;
      expect(Array.isArray(body)).toBe(true);

      if (body.length > 0) {
        body.forEach((jobPosition) => {
          expect(jobPosition).toHaveProperty("id");
          expect(jobPosition).toHaveProperty("name");

          expect(typeof jobPosition.id).toBe("string");
          expect(typeof jobPosition.name).toBe("string");
          expect(jobPosition.name.length).toBeGreaterThan(0);
        });
      }
    });

    it("should return job positions with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;

      const testJobPosition = body.find((jp) =>
        jp.name.includes("Gerente de Sostenibilidad")
      );
      expect(testJobPosition).toBeDefined();
      expect(testJobPosition!.name).toBe("Gerente de Sostenibilidad");
    });
  });

  describe("Job position categories", () => {
    it("should return all expected job position categories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;

      const expectedNames = [
        "Administrador de Bases de Datos",
        "Analista de Huella de Carbono",
        "Analista de Sostenibilidad",
        "Contador",
        "Director Ejecutivo (CEO)",
        "Director de Sostenibilidad (CSO)",
        "Especialista en Cambio Climático",
        "Gerente de Sostenibilidad",
        "Ingeniero de Software",
        "Otro",
      ];

      expectedNames.forEach((expectedName) => {
        const found = body.find((jp) => jp.name === expectedName);
        expect(found).toBeDefined();
      });
    });
  });

  describe("Ordering", () => {
    it("should return job positions ordered by name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;
      const names = body.map((jp) => jp.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;
      const ids = body.map((jp) => jp.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique names", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/job-positions",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllJobPositionsResponse;
      const names = body.map((jp) => jp.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
