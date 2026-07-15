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
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import {
  cleanupCarbonInventoryTestData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestSubmissions,
  createTestSubmission,
  createTestSubmissionSubjectForCarbonInventory,
} from "@test/factories/submissionFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, SubmissionStatus, SubmissionType } from "@repo/database";
import type { GetCarbonInventoryBadgesResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

// Exercises the read model behind the carbon-inventory "badges" tab: an
// inventory only exposes badges once its linked submission-subject carries at
// least one APPROVED/APPROVED_AUTOMATICALLY submission with a non
// ORGANIZATION_ACCREDITATION badge. This covers the findUnique whereClause
// short-circuit (L78 `if (!carbonInventory) return []`), the optional-chain +
// `?? []` + null-filter on the mapped badges (L135-137), and the
// ORGANIZATION_ACCREDITATION exclusion filter (L146-148, L150).
//
// NOTE: the reduction-project badge path (L139-144) is NOT covered here —
// wiring a full reduction-project prerequisite chain (its own organization +
// membership + verification submission) just to reach that branch was judged
// too costly relative to the payoff; the inventory-badge path already
// exercises the same optional-chain/??/filter shape.

describe("GET /api/carbon-inventories/:id/badges - getCarbonInventoryBadges Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
  });

  async function getBadges(carbonInventoryId: string) {
    return app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${carbonInventoryId}/badges`,
    });
  }

  it("returns signed previews for eligible badges, sorted, excluding org-accreditation and badge-less submissions", async () => {
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft
    );
    const subject = await createTestSubmissionSubjectForCarbonInventory(
      prisma,
      inventory.id
    );

    // Eligible badge, higher BADGE_SORT_ORDER (2) — created first to prove sorting.
    const { badge: verificationBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_VERIFICATION
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        badgeId: verificationBadge.id,
      }
    );

    // Eligible badge, lower BADGE_SORT_ORDER (1) — should sort before the one above.
    const { badge: calculationBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_CALCULATION
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        badgeId: calculationBadge.id,
      }
    );

    // Approved submission whose badge is ORGANIZATION_ACCREDITATION — must be filtered out.
    const { badge: orgBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.ORGANIZATION_ACCREDITATION
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.REDUCTION_PROJECT_VERIFICATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        badgeId: orgBadge.id,
      }
    );

    // Approved submission with no badge at all — must be filtered out by the null check.
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
      }
    );

    const response = await getBadges(inventory.id.toString());
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCarbonInventoryBadgesResponse;

    expect(body).toHaveLength(2);
    expect(body.map((entry) => entry.badgeType)).toEqual([
      BadgeType.CARBON_INVENTORY_CALCULATION,
      BadgeType.CARBON_INVENTORY_VERIFICATION,
    ]);
    for (const entry of body) {
      expect(entry.previewUrl).toMatch(/^https?:\/\//);
    }
  });

  it("returns an empty array when the inventory has no submission subject at all", async () => {
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft
    );

    const response = await getBadges(inventory.id.toString());
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it("returns an empty array when the only submission is still PENDING", async () => {
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft
    );
    const subject = await createTestSubmissionSubjectForCarbonInventory(
      prisma,
      inventory.id
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      { status: SubmissionStatus.PENDING, createdById: testUser.id }
    );

    const response = await getBadges(inventory.id.toString());
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it("returns an empty array when the only approved submission's badge is ORGANIZATION_ACCREDITATION", async () => {
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft
    );
    const subject = await createTestSubmissionSubjectForCarbonInventory(
      prisma,
      inventory.id
    );
    const { badge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.ORGANIZATION_ACCREDITATION
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        badgeId: badge.id,
      }
    );

    const response = await getBadges(inventory.id.toString());
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it("returns 403 when the carbon inventory does not exist", async () => {
    const response = await getBadges("999999999");
    expect(response.statusCode).toBe(403);
    expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
      "FORBIDDEN"
    );
  });
});
