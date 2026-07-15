import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "@test/factories/appFactory.js";

describe("Root and health routes - Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
  });

  afterAll(async () => {
    await app.prisma.$disconnect();
    await app.close();
  });

  describe("GET /health", () => {
    it("reports ok when the database is reachable", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        status: string;
        database: string;
        version: string;
        uptime: number;
      };
      expect(body.status).toBe("ok");
      expect(body.database).toBe("connected");
      expect(body.version).toBeTruthy();
      expect(typeof body.uptime).toBe("number");
    });
  });

  describe("GET /", () => {
    it("serves the landing page html", async () => {
      const response = await app.inject({ method: "GET", url: "/" });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("API Huella Latam");
      expect(response.body).toContain("/health");
    });
  });
});
