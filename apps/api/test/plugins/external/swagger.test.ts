import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "@test/factories/appFactory.js";

// The swagger plugin's `transform` runs once per route when the OpenAPI document
// is generated (`app.swagger()`), branching on each route's access config to set
// the right security requirement. Building the doc over the whole registered
// route table exercises all three legs of that branch: public routes (empty
// security), anonymous routes (bearerAuth OR inventoryUuid) and protected
// routes (bearerAuth only).

interface OpenApiOperation {
  security?: Array<Record<string, string[]>>;
}
interface OpenApiDoc {
  components?: { securitySchemes?: Record<string, unknown> };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

describe("swagger plugin - OpenAPI security transform", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
  });

  afterAll(async () => {
    await app.prisma.$disconnect();
    await app.close();
  });

  it("builds the document and applies per-route security for public, anonymous and protected routes", () => {
    const spec = (app as unknown as { swagger: () => OpenApiDoc }).swagger();

    expect(spec.components?.securitySchemes).toHaveProperty("bearerAuth");
    expect(spec.components?.securitySchemes).toHaveProperty("inventoryUuid");

    const securityShapes = new Set<string>();
    for (const pathItem of Object.values(spec.paths)) {
      for (const operation of Object.values(pathItem)) {
        if (
          operation &&
          typeof operation === "object" &&
          "security" in operation
        ) {
          securityShapes.add(JSON.stringify(operation.security));
        }
      }
    }

    // protected → bearerAuth only
    expect(securityShapes).toContain(JSON.stringify([{ bearerAuth: [] }]));
    // anonymous → bearerAuth + inventoryUuid
    expect(securityShapes).toContain(
      JSON.stringify([{ bearerAuth: [] }, { inventoryUuid: [] }])
    );
    // public → empty security
    expect(securityShapes).toContain(JSON.stringify([]));
  });
});
