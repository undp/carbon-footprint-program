import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance, InjectOptions } from "fastify";
import { type PrismaClient, type User, SystemRole } from "@repo/database";

// The ids never reach a service: the role check runs before it, so a
// nonexistent id proves the route is closed without seeding anything. Bodies
// must still be schema-valid because Fastify validates before the role hook.
const MISSING_ID = "999999999";

const ROUTES: Array<{ name: string; request: InjectOptions }> = [
  {
    name: "GET /api/emission-factor-dimensions",
    request: {
      method: "GET",
      url: `/api/emission-factor-dimensions?methodologyVersionId=${MISSING_ID}`,
    },
  },
  {
    name: "POST /api/emission-factor-dimensions",
    request: {
      method: "POST",
      url: "/api/emission-factor-dimensions/",
      payload: {
        subcategoryId: MISSING_ID,
        name: "Test dimension",
        position: 1,
        isRequired: false,
        values: ["Test value"],
      },
    },
  },
  {
    name: "PATCH /api/emission-factor-dimensions/:id",
    request: {
      method: "PATCH",
      url: `/api/emission-factor-dimensions/${MISSING_ID}`,
      payload: { name: "Renamed dimension" },
    },
  },
  {
    name: "DELETE /api/emission-factor-dimensions/:id",
    request: {
      method: "DELETE",
      url: `/api/emission-factor-dimensions/${MISSING_ID}`,
    },
  },
];

describe("Emission factor dimension routes - Authorization", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function injectAs(role: SystemRole, request: InjectOptions) {
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role },
    });
    try {
      return await app.inject(request);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  }

  it.each(ROUTES)(
    "$name returns 403 when the caller has USER role",
    async ({ request }) => {
      const response = await injectAs(SystemRole.USER, request);

      expect(response.statusCode).toBe(403);
    }
  );

  it.each(ROUTES)(
    "$name lets a system ADMIN past the role check",
    async ({ request }) => {
      const response = await injectAs(SystemRole.ADMIN, request);

      expect(response.statusCode).not.toBe(403);
    }
  );
});
