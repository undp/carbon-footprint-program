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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";

/**
 * Integration tests for userResolvePlugin — the global preHandler that
 * JIT-provisions a User row from the authenticated principal.
 *
 * AUTH_PROVIDER=forced-user (set in vitest.config.ts) always injects:
 *   idpUserId = "test-user-idp-id"
 *   email     = "me@test.com"
 *
 * The seed populates a matching User row. These tests manipulate that row
 * to exercise the plugin's P2002 disambiguation logic, then restore state
 * in afterEach so subsequent test files are unaffected.
 */

// Env values mirrored from vitest.config.ts so the forced auth identity is
// available as constants in test assertions.
const FORCED_IDP_USER_ID = "test-user-idp-id";
const FORCED_EMAIL = "me@test.com";

// A distinct idpUserId used to simulate "different identity, same email".
const COLLIDING_IDP_USER_ID = "other-idp-provider-user-id";

describe("userResolvePlugin — P2002 email collision", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let seedUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Snapshot the seeded forced user so we can restore it after each test.
    const found = await prisma.user.findUnique({
      where: { idpUserId: FORCED_IDP_USER_ID },
    });
    if (!found) {
      throw new Error(
        `Seeded forced user (idpUserId="${FORCED_IDP_USER_ID}") not found. ` +
          "Ensure the testing dataset seeds ran before this suite."
      );
    }
    seedUser = found;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Remove the colliding user (if it exists) so it never leaks between cases.
    await prisma.user.deleteMany({
      where: { idpUserId: COLLIDING_IDP_USER_ID },
    });

    // Ensure the forced user row exists and is back to its original state.
    // upsert is safe here: if a test deleted it we re-create it; if it still
    // exists we overwrite any mutation (e.g. JIT-created variant with fewer fields).
    await prisma.user.upsert({
      where: { idpUserId: FORCED_IDP_USER_ID },
      create: {
        idpUserId: seedUser.idpUserId!,
        email: seedUser.email!,
        idpName: seedUser.idpName,
        role: seedUser.role,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        countryJobPositionId: seedUser.countryJobPositionId,
        updatedAt: null,
      },
      update: {
        email: seedUser.email!,
        idpName: seedUser.idpName,
        role: seedUser.role,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        countryJobPositionId: seedUser.countryJobPositionId,
      },
    });
  });

  describe("email already registered under a different identity", () => {
    it("returns HTTP 409 with code EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY when the forced-user email belongs to a different idpUserId", async () => {
      // 1. Delete the forced user row so findUnique returns null on the
      //    forced idpUserId — this puts the plugin on the create path.
      await prisma.user.delete({ where: { idpUserId: FORCED_IDP_USER_ID } });

      // 2. Insert a different user that already owns the forced email.
      //    Same email (FORCED_EMAIL), different idpUserId (COLLIDING_IDP_USER_ID).
      await prisma.user.create({
        data: {
          idpUserId: COLLIDING_IDP_USER_ID,
          email: FORCED_EMAIL,
          idpName: "other-provider",
        },
      });

      // 3. Make any authenticated request; the plugin runs as preHandler on every
      //    private route. GET /api/users/me is the simplest target.
      //    The plugin will:
      //      findUnique({ idpUserId: "test-user-idp-id" }) → null
      //      create({ idpUserId: "test-user-idp-id", email: "me@test.com" }) → P2002(email)
      //      → throw EmailRegisteredUnderDifferentIdentityError
      const response = await app.inject({
        method: "GET",
        url: "/api/users/me",
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY");
      expect(body.message).toBe(
        "Email already registered under a different identity"
      );
    });
  });

  describe("brand-new identity — JIT provisioning (sanity / regression)", () => {
    it("provisions a new User row and returns HTTP 200 when neither idpUserId nor email collide", async () => {
      // Remove the forced user row so the plugin must JIT-create it.
      // There is no pre-existing user with email "me@test.com" (the colliding
      // user is NOT created here), so the create succeeds.
      await prisma.user.delete({ where: { idpUserId: FORCED_IDP_USER_ID } });

      const response = await app.inject({
        method: "GET",
        url: "/api/users/me",
      });

      // The plugin created the user successfully; the handler finds it and returns 200.
      expect(response.statusCode).toBe(200);

      // Verify the JIT-provisioned row was actually written to the database.
      const provisioned = await prisma.user.findUnique({
        where: { idpUserId: FORCED_IDP_USER_ID },
      });
      expect(provisioned).not.toBeNull();
      expect(provisioned!.email).toBe(FORCED_EMAIL);
      expect(provisioned!.idpName).toBe("N/D"); // value injected by ForcedUserProvider
    });
  });

  describe("existing user — no provisioning needed", () => {
    it("returns HTTP 200 and reuses the existing row when the forced idpUserId is already in the database", async () => {
      // The seeded user is present (no manipulation in this test). The plugin
      // finds it via findUnique and attaches it without creating anything.
      const before = await prisma.user.count({
        where: { idpUserId: FORCED_IDP_USER_ID },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { idpUserId: string };
      expect(body.idpUserId).toBe(FORCED_IDP_USER_ID);

      // Row count must not have increased — no duplicate was created.
      const after = await prisma.user.count({
        where: { idpUserId: FORCED_IDP_USER_ID },
      });
      expect(after).toBe(before);
    });
  });
});
