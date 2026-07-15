import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import healthRoutes from "@/routes/health.js";

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

  // The 503 legs never run against the real test app (Prisma is always wired and
  // reachable). Mount the route on a bare Fastify instance with a stubbed
  // `prisma` decorator to drive the "not configured" guard and the query-failure
  // catch block, including both arms of its `error instanceof Error` message.
  describe("GET /health - degraded paths", () => {
    async function buildHealthApp(prisma?: unknown): Promise<FastifyInstance> {
      const instance = Fastify();
      if (prisma !== undefined)
        instance.decorate("prisma", prisma as PrismaClient);
      instance.register((scope, _opts, done) => {
        healthRoutes(scope);
        done();
      });
      await instance.ready();
      return instance;
    }

    it("returns 503 'not configured' when Prisma is absent", async () => {
      const degraded = await buildHealthApp();
      try {
        const response = await degraded.inject({
          method: "GET",
          url: "/health",
        });
        expect(response.statusCode).toBe(503);
        const body = JSON.parse(response.body) as {
          status: string;
          database: string;
        };
        expect(body.status).toBe("degraded");
        expect(body.database).toBe("not configured");
      } finally {
        await degraded.close();
      }
    });

    it("returns 503 'disconnected' with the Error message when the query throws", async () => {
      const degraded = await buildHealthApp({
        $queryRaw: () => {
          throw new Error("connection refused");
        },
      });
      try {
        const response = await degraded.inject({
          method: "GET",
          url: "/health",
        });
        expect(response.statusCode).toBe(503);
        const body = JSON.parse(response.body) as {
          database: string;
          error: string;
        };
        expect(body.database).toBe("disconnected");
        expect(body.error).toBe("connection refused");
      } finally {
        await degraded.close();
      }
    });

    it("returns 503 with a generic message when the query throws a non-Error", async () => {
      const degraded = await buildHealthApp({
        $queryRaw: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "not an error object";
        },
      });
      try {
        const response = await degraded.inject({
          method: "GET",
          url: "/health",
        });
        expect(response.statusCode).toBe(503);
        const body = JSON.parse(response.body) as { error: string };
        expect(body.error).toBe("Unknown error");
      } finally {
        await degraded.close();
      }
    });
  });
});
