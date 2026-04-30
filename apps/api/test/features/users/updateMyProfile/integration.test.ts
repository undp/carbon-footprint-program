import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { UpdateMyProfileResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("PATCH /api/users/me - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testJobPositionId: bigint;
  let loggedUser: Awaited<ReturnType<typeof getTestLoggedUser>>;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    loggedUser = await getTestLoggedUser(prisma);

    const jobPositions = await prisma.countryJobPosition.findMany({ take: 2 });
    if (jobPositions.length < 2) {
      throw new Error("Need at least 2 job positions in database for testing");
    }
    testJobPositionId = jobPositions[0].id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.user.update({
      where: { id: loggedUser.id },
      data: {
        firstName: loggedUser.firstName,
        lastName: loggedUser.lastName,
        email: loggedUser.email,
        countryJobPositionId: loggedUser.countryJobPositionId,
        idpUserId: loggedUser.idpUserId,
        idpName: loggedUser.idpName,
        termsAccepted: loggedUser.termsAccepted,
      },
    });
    await prisma.user.deleteMany({
      where: { idpUserId: { startsWith: "test-idp-" } },
    });
  });

  describe("Successful updates", () => {
    it("updates the firstName", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { firstName: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.firstName).toBe("Updated");
      expect(body.id).toBe(loggedUser.id.toString());
    });

    it("updates the email", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { email: "updated@test.example.com" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.email).toBe("updated@test.example.com");
    });

    it("updates the countryJobPositionId", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { countryJobPositionId: testJobPositionId.toString() },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.countryJobPositionId).toBe(testJobPositionId.toString());
    });

    it("sets updatedById to the current user when fields change", async () => {
      await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { firstName: "Tracked" },
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: loggedUser.id },
      });
      expect(updated.updatedById?.toString()).toBe(loggedUser.id.toString());
    });
  });

  describe("Error handling", () => {
    it("returns 409 when email is already in use", async () => {
      const conflicting = await prisma.user.create({
        data: {
          email: "conflict@test.example.com",
          idpUserId: "test-idp-conflict",
          firstName: "Conflict",
          lastName: "User",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { email: conflicting.email! },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EMAIL_ALREADY_IN_USE");
    });

    it("returns 409 when idpUserId is already in use", async () => {
      const conflicting = await prisma.user.create({
        data: {
          email: "idp-conflict@test.example.com",
          idpUserId: "test-idp-conflict-other",
          firstName: "Conflict",
          lastName: "User",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { idpUserId: conflicting.idpUserId! },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("IDP_USER_ID_ALREADY_IN_USE");
    });

    it("returns 400 when countryJobPositionId does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { countryJobPositionId: "999999999" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("INVALID_COUNTRY_JOB_POSITION_ID");
    });

    it("returns 400 when body has unknown fields", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { unknownField: "value" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when body includes role (rejected by schema)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { role: "ADMIN" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
