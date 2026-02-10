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
import type { ToggleOrganizationBlockedResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("PATCH /api/admin/organizations/:id/blocked - Toggle Organization Blocked Status", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testCountryId: bigint;
  let testJobPositionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    const country = await prisma.country.findFirst();
    if (!country) {
      throw new Error("No country found in database for testing");
    }
    testCountryId = country.id;

    const jobPosition = await prisma.countryJobPosition.findFirst();
    if (!jobPosition) {
      throw new Error("No job position found in database for testing");
    }
    testJobPositionId = jobPosition.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test organizations and related data
    await prisma.submission.deleteMany({
      where: {
        subject: {
          organizationData: {
            organizationData: {
              organization: {
                countryId: testCountryId,
                status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
              },
            },
          },
        },
      },
    });
    await prisma.submissionSubjectOrganizationData.deleteMany({
      where: {
        organizationData: {
          organization: {
            countryId: testCountryId,
            status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
          },
        },
      },
    });
    await prisma.submissionSubject.deleteMany({
      where: {
        organizationData: {
          organizationData: {
            organization: {
              countryId: testCountryId,
              status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
            },
          },
        },
      },
    });
    await prisma.organizationData.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.carbonInventory.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.userOrganizationMembership.deleteMany({
      where: {
        organization: {
          countryId: testCountryId,
          status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        countryId: testCountryId,
        status: { in: ["NOT_ACCREDITED", "ACCREDITED", "BLOCKED"] },
      },
    });
  });

  async function createTestOrganization(
    status: "NOT_ACCREDITED" | "ACCREDITED" | "BLOCKED" = "NOT_ACCREDITED"
  ) {
    return prisma.organization.create({
      data: {
        countryId: testCountryId,
        status,
      },
    });
  }

  describe("Blocking an organization", () => {
    it("should block a NOT_ACCREDITED organization", async () => {
      const org = await createTestOrganization("NOT_ACCREDITED");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.id).toBe(org.id.toString());
      expect(body.status).toBe("BLOCKED");
      expect(body.previousStatus).toBe("NOT_ACCREDITED");

      // Verify in database
      const dbOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(dbOrg!.status).toBe("BLOCKED");
    });

    it("should block an ACCREDITED organization", async () => {
      const org = await createTestOrganization("ACCREDITED");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.id).toBe(org.id.toString());
      expect(body.status).toBe("BLOCKED");
      expect(body.previousStatus).toBe("ACCREDITED");
    });
  });

  describe("Unblocking an organization", () => {
    it("should unblock to NOT_ACCREDITED when no approved submission exists", async () => {
      const org = await createTestOrganization("BLOCKED");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.id).toBe(org.id.toString());
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.previousStatus).toBe("BLOCKED");
    });

    it("should unblock to ACCREDITED when org has completed data with approved submission", async () => {
      const org = await createTestOrganization("BLOCKED");

      // Create completed organization data
      const orgData = await prisma.organizationData.create({
        data: {
          organizationId: org.id,
          status: "COMPLETED",
          legalName: "Test Org",
          taxId: "123456",
          representativeFullName: "John Doe",
          representativeTaxId: "654321",
          representativeCountryJobPositionId: testJobPositionId,
          representativePhone: "+1234567890",
          representativeEmail: "rep@test.com",
        },
      });

      // Create submission subject and link to organization data
      const subject = await prisma.submissionSubject.create({
        data: {
          subjectType: "ORGANIZATION_DATA",
          organizationData: {
            create: {
              organizationDataId: orgData.id,
            },
          },
          submissions: {
            create: {
              status: "APPROVED",
            },
          },
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.id).toBe(org.id.toString());
      expect(body.status).toBe("ACCREDITED");
      expect(body.previousStatus).toBe("BLOCKED");

      // Verify in database
      const dbOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(dbOrg!.status).toBe("ACCREDITED");
    });

    it("should unblock to NOT_ACCREDITED when org has completed data but no approved submission", async () => {
      const org = await createTestOrganization("BLOCKED");

      // Create completed organization data
      const orgData = await prisma.organizationData.create({
        data: {
          organizationId: org.id,
          status: "COMPLETED",
          legalName: "Test Org",
          taxId: "123456",
          representativeFullName: "John Doe",
          representativeTaxId: "654321",
          representativeCountryJobPositionId: testJobPositionId,
          representativePhone: "+1234567890",
          representativeEmail: "rep@test.com",
        },
      });

      // Create submission subject with REJECTED submission
      await prisma.submissionSubject.create({
        data: {
          subjectType: "ORGANIZATION_DATA",
          organizationData: {
            create: {
              organizationDataId: orgData.id,
            },
          },
          submissions: {
            create: {
              status: "REJECTED",
            },
          },
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.id).toBe(org.id.toString());
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.previousStatus).toBe("BLOCKED");
    });

    it("should unblock to NOT_ACCREDITED when org has only DRAFT data", async () => {
      const org = await createTestOrganization("BLOCKED");

      // Create draft organization data (not completed)
      await prisma.organizationData.create({
        data: {
          organizationId: org.id,
          status: "DRAFT",
          legalName: "Test Org Draft",
          taxId: "123456",
          representativeFullName: "John Doe",
          representativeTaxId: "654321",
          representativeCountryJobPositionId: testJobPositionId,
          representativePhone: "+1234567890",
          representativeEmail: "rep@test.com",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as ToggleOrganizationBlockedResponse;
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.previousStatus).toBe("BLOCKED");
    });
  });

  describe("Toggle idempotency", () => {
    it("should toggle block and unblock correctly", async () => {
      const org = await createTestOrganization("NOT_ACCREDITED");

      // First toggle: block
      const blockResponse = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });
      expect(blockResponse.statusCode).toBe(200);
      const blockBody = JSON.parse(
        blockResponse.body
      ) as ToggleOrganizationBlockedResponse;
      expect(blockBody.status).toBe("BLOCKED");

      // Second toggle: unblock
      const unblockResponse = await app.inject({
        method: "PATCH",
        url: `/api/admin/organizations/${org.id}/blocked`,
      });
      expect(unblockResponse.statusCode).toBe(200);
      const unblockBody = JSON.parse(
        unblockResponse.body
      ) as ToggleOrganizationBlockedResponse;
      expect(unblockBody.status).toBe("NOT_ACCREDITED");
      expect(unblockBody.previousStatus).toBe("BLOCKED");
    });
  });

  describe("Error handling", () => {
    it("should return 404 when organization does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/organizations/999999/blocked",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_NOT_FOUND");
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/organizations/invalid-id/blocked",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
