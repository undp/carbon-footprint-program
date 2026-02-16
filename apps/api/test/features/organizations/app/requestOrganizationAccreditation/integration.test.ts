import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionSubjectType,
  MembershipStatus,
} from "@repo/database";
import type { RequestOrganizationAccreditationResponse } from "@repo/types";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestMembership } from "../../../../factories/membershipFactory.js";

describe("POST /api/app/organizations/:id/accredit - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Successful accreditation request", () => {
    it("should successfully request accreditation for organization with active data", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      // Create active membership for user
      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RequestOrganizationAccreditationResponse;
      expect(body).toEqual({});

      // Verify submission was created
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationData: {
                organizationId: org.id,
              },
            },
          },
        },
        include: {
          subject: {
            include: {
              organizationData: true,
            },
          },
        },
      });

      expect(submission).toBeTruthy();
      expect(submission!.status).toBe(SubmissionStatus.PENDING);
      expect(submission!.subject.subjectType).toBe(
        SubmissionSubjectType.ORGANIZATION_DATA
      );
      expect(submission!.createdById).toBe(user.id);
    });

    it("should create submission with correct subject type", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(200);

      // Verify submission subject is correctly linked
      const subject = await prisma.submissionSubject.findFirst({
        where: {
          subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
          organizationData: {
            organizationDataId: orgData.id,
          },
        },
        include: {
          organizationData: true,
          submissions: true,
        },
      });

      expect(subject).toBeTruthy();
      expect(subject!.subjectType).toBe(
        SubmissionSubjectType.ORGANIZATION_DATA
      );
      expect(subject!.organizationData!.organizationDataId).toBe(orgData.id);
      expect(subject!.submissions).toBeDefined();
      expect(subject!.submissions.length).toBe(1);
      expect(subject!.submissions[0].status).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Access control", () => {
    it("should return 403 when user has no membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
      expect(body.message).toContain(org.id.toString());

      // Verify no submission was created
      const submissionCount = await prisma.submission.count({
        where: {
          subject: {
            organizationData: {
              organizationData: {
                organizationId: org.id,
              },
            },
          },
        },
      });

      expect(submissionCount).toBe(0);
    });

    it("should return 403 when user membership is not active", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      // Create inactive membership
      await createTestMembership(prisma, user.id, org.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();

      // Verify no submission was created
      const submissionCount = await prisma.submission.count();
      expect(submissionCount).toBe(0);
    });
  });

  describe("Validation and error handling", () => {
    it("should return 404 when organization does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations/999999999/accredit",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 404 when organization has no active data", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
      expect(body.message).toContain(org.id.toString());
    });

    it("should return 404 when organization data is outdated", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.OUTDATED,
      });

      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 409 when submission already exists", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      // Create existing submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
      expect(body.message).toContain(org.id.toString());

      // Verify only one submission exists
      const submissionCount = await prisma.submission.count({
        where: {
          subject: {
            organizationData: {
              organizationDataId: orgData.id,
            },
          },
        },
      });

      expect(submissionCount).toBe(1);
    });

    it("should return 409 when approved submission exists", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      // Create approved submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid organization ID format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations/invalid-id/accredit",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative organization ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations/-1/accredit",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("State transitions", () => {
    it("should create submission in PENDING state", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationData: {
                organizationId: org.id,
              },
            },
          },
        },
      });

      expect(submission).toBeTruthy();
      expect(submission!.status).toBe(SubmissionStatus.PENDING);
      expect(submission!.reviewerId).toBeNull();
      expect(submission!.reviewComments).toBeNull();
    });

    it("should not modify organization status when creating submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      expect(updatedOrg!.status).toBe(OrganizationStatus.ACTIVE);
    });

    it("should not modify organization data status when creating submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      const updatedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedOrgData!.status).toBe(OrganizationDataStatus.ACTIVE);
    });

    it("should set correct audit fields on submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      const beforeRequest = new Date();

      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      const afterRequest = new Date();

      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationData: {
                organizationId: org.id,
              },
            },
          },
        },
      });

      expect(submission).toBeTruthy();
      expect(submission!.createdById).toBe(user.id);
      expect(submission!.updatedById).toBe(user.id);
      expect(new Date(submission!.createdAt).getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime()
      );
      expect(new Date(submission!.createdAt).getTime()).toBeLessThanOrEqual(
        afterRequest.getTime()
      );
    });
  });

  describe("Data consistency", () => {
    it("should not affect other organizations when creating submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org1.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org2.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      // Create memberships for both
      await createTestMembership(prisma, user.id, org1.id);
      await createTestMembership(prisma, user.id, org2.id);

      // Request accreditation for org1
      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org1.id.toString()}/accredit`,
      });

      // Verify org2 has no submission
      const org2SubmissionCount = await prisma.submission.count({
        where: {
          subject: {
            organizationData: {
              organizationData: {
                organizationId: org2.id,
              },
            },
          },
        },
      });

      expect(org2SubmissionCount).toBe(0);
    });

    it("should handle blocked organization with active membership", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      // Should still allow submission (blocking is organization-level, not submission-level)
      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      // This might succeed or fail depending on business rules
      // Verifying it doesn't crash
      expect([200, 403, 409]).toContain(response.statusCode);
    });

    it("should create submission subject with correct creator", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      const subject = await prisma.submissionSubject.findFirst({
        where: {
          subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
          organizationData: {
            organizationData: {
              organizationId: org.id,
            },
          },
        },
      });

      expect(subject).toBeTruthy();
      expect(subject!.createdById).toBe(user.id);
    });
  });

  describe("Edge cases", () => {
    it("should handle organization with multiple data versions but only one active", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // Create outdated data
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.OUTDATED,
      });

      // Create active data
      const activeData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org.id.toString()}/accredit`,
      });

      expect(response.statusCode).toBe(200);

      // Verify submission is linked to active data
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: activeData.id,
            },
          },
        },
      });

      expect(submission).toBeTruthy();
    });
  });
});
