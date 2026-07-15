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
import {
  getTestLoggedUser,
  createTestUser,
} from "@test/factories/userFactory.js";
import type { UpdateMyProfileResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { updateMyProfileService } from "@/features/users/updateMyProfile/service.js";

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

    const jobPosition = await prisma.countryJobPosition.findFirst();
    if (!jobPosition) {
      throw new Error("Need at least 1 job position in database for testing");
    }
    testJobPositionId = jobPosition.id;
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

    it("updates the lastName", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { lastName: "UpdatedLastName" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.lastName).toBe("UpdatedLastName");
    });

    it("clears the countryJobPositionId when set to null", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { countryJobPositionId: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.countryJobPositionId).toBeNull();
    });

    it("updates idpName to a non-null value", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { idpName: "google" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.idpName).toBe("google");
    });

    it("clears idpName when set to null", async () => {
      // First set a non-null value so the null update is a meaningful change.
      await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { idpName: "google" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { idpName: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.idpName).toBeNull();
    });

    it("updates termsAccepted", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/me",
        payload: { termsAccepted: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMyProfileResponse;
      expect(body.termsAccepted).toBe(true);
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

  describe("Service-level not-found handling", () => {
    // The HTTP layer auto-provisions the forced-user on every request (see
    // user-resolve-plugin), so a deleted "current user" can never reach this
    // service via app.inject(). Exercise the P2025 branch directly against the
    // real database instead.
    it("throws USER_NOT_FOUND when the target user row no longer exists", async () => {
      const ghost = await createTestUser(prisma);
      await prisma.user.delete({ where: { id: ghost.id } });

      await expect(
        updateMyProfileService(prisma, ghost.id.toString(), {
          firstName: "Ghost",
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    });
  });
});
