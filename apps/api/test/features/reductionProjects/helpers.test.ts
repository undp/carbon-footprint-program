import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  calculateReductionProjectDisplayStatus,
  validateReductionProjectPrerequisites,
} from "@/features/reductionProjects/helpers.js";
import {
  ReductionProjectStatus,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

// These branches are pure logic (calculateReductionProjectDisplayStatus) or
// gated behind auth wiring that always supplies a non-null userId and never
// passes `allowedRoles` from any current HTTP caller
// (validateReductionProjectPrerequisites). Every route that reaches
// calculateReductionProjectDisplayStatus first filters `status: ACTIVE` at the
// query level (or, for updateReductionProject, is gated by the
// `requireReductionProjectAccess` preHandler, which itself 403s on DELETED
// before the service runs) — so the DELETED branch can never be reached via
// app.inject(). Call the exported functions directly (still against the real
// per-file database for the DB-touching branch) to cover them.
describe("reductionProjects/helpers.ts - direct unit coverage", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe("calculateReductionProjectDisplayStatus", () => {
    it("returns DELETED immediately for a DELETED project, without inspecting submissions", () => {
      const displayStatus = calculateReductionProjectDisplayStatus({
        id: 1n,
        status: ReductionProjectStatus.DELETED,
        // Deliberately malformed/absent — proves the function short-circuits
        // before ever reading `submission`.
        submission: null,
      });

      expect(displayStatus).toBe(ReductionProjectDisplayStatusEnum.DELETED);
    });
  });

  describe("validateReductionProjectPrerequisites", () => {
    it("throws REDUCTION_PROJECT_INVALID_DATA when userId is null", async () => {
      await expect(
        validateReductionProjectPrerequisites(prisma, "1", "1", null)
      ).rejects.toMatchObject({
        statusCode: 422,
        code: "REDUCTION_PROJECT_INVALID_DATA",
      });
    });

    it("applies the allowedRoles membership filter when provided", async () => {
      // No organization/carbon inventory exists with these IDs, so the query
      // resolves to no row regardless of the allowedRoles filter — this only
      // needs to prove the `allowedRoles` branch executes (builds the
      // membership filter) without throwing a type/query error.
      await expect(
        validateReductionProjectPrerequisites(
          prisma,
          "999999999",
          "999999999",
          testUserId,
          [OrganizationRole.ADMIN, OrganizationRole.CONTRIBUTOR]
        )
      ).rejects.toMatchObject({
        statusCode: 422,
        code: "REDUCTION_PROJECT_INVALID_DATA",
      });
    });
  });
});
