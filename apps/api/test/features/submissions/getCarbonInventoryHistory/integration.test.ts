import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import {
  SubmissionEventType,
  type GetSubmissionHistoryResponse,
} from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupCarbonInventoryTestData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestSubmissions,
  createTestSubmission,
  createTestSubmissionSubjectForCarbonInventory,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/submissions/carbon-inventory/:id/history - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
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
    vi.clearAllMocks();
    await cleanupTestFiles(prisma);
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  async function createMemberOrganization() {
    const organization = await createTestOrganization(prisma);
    await createTestMembership(prisma, testUser.id, organization.id);
    return organization;
  }

  async function getHistory(
    carbonInventoryId: string
  ): Promise<GetSubmissionHistoryResponse> {
    const response = await requestHistory(carbonInventoryId);

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as GetSubmissionHistoryResponse;
  }

  async function requestHistory(carbonInventoryId: string) {
    return app.inject({
      method: "GET",
      url: `/api/submissions/carbon-inventory/${carbonInventoryId}/history`,
    });
  }

  it("includes auto-approved submissions in timeline", async () => {
    const organization = await createMemberOrganization();
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      {
        organizationId: organization.id,
        year: 2024,
        selfDeclaredAt: new Date("2026-01-01T08:00:00.000Z"),
        isSelfDeclared: true,
      }
    );
    const subject = await createTestSubmissionSubjectForCarbonInventory(
      prisma,
      inventory.id
    );
    await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      {
        status: SubmissionStatus.APPROVED_AUTOMATICALLY,
        createdById: testUser.id,
        reviewerId: testUser.id,
        createdAt: new Date("2026-01-02T08:00:00.000Z"),
        reviewedAt: new Date("2026-01-03T08:00:00.000Z"),
      }
    );
    const verificationSubmission = await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        reviewerId: testUser.id,
        createdAt: new Date("2026-01-04T08:00:00.000Z"),
        reviewedAt: new Date("2026-01-05T08:00:00.000Z"),
      }
    );

    const history = await getHistory(inventory.id.toString());

    expect(history.map((entry) => entry.eventType)).toEqual([
      SubmissionEventType.APPROVED,
      SubmissionEventType.ON_REVIEW,
      SubmissionEventType.POSTULATION,
      SubmissionEventType.APPROVED_AUTOMATICALLY,
      SubmissionEventType.SELF_DECLARATION,
    ]);
    expect(history[0]).toMatchObject({
      submissionId: verificationSubmission.id.toString(),
      submissionType: SubmissionType.CARBON_INVENTORY_VERIFICATION,
      date: "2026-01-05T08:00:00.000Z",
    });
  });

  it("returns SELF_DECLARATION even when the inventory has no submission subject yet", async () => {
    const organization = await createMemberOrganization();
    const selfDeclaredAt = new Date("2026-02-01T12:00:00.000Z");
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      {
        organizationId: organization.id,
        year: 2024,
        selfDeclaredAt,
        isSelfDeclared: true,
      }
    );

    const history = await getHistory(inventory.id.toString());

    expect(history).toEqual([
      expect.objectContaining({
        submissionId: null,
        submissionType: null,
        status: null,
        eventType: SubmissionEventType.SELF_DECLARATION,
        date: selfDeclaredAt.toISOString(),
        carbonInventoryId: inventory.id.toString(),
      }),
    ]);
  });
});
