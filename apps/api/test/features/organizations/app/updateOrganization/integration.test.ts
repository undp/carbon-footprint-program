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
  MembershipStatus,
} from "@repo/database";
import type { UpdateOrganizationResponse } from "@repo/types";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { getTestCountryJobPositionId } from "@test/factories/jobPositionFactory.js";
import { createTestMembership } from "../../../../factories/membershipFactory.js";

describe("PATCH /api/app/organizations/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;
  let testOrganizationRoleId: bigint;
  let testCountryJobPositionId: bigint;
  let testSectorId: bigint;
  let testSubsectorId: bigint;
  let testMainActivityId: bigint;
  let testCountryOrganizationSizeId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Get test user
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;

    // Get test organization role
    const organizationRole = await prisma.organizationRole.findFirst({
      select: { id: true },
    });
    if (!organizationRole) {
      throw new Error("No organization role found in database");
    }
    testOrganizationRoleId = organizationRole.id;

    // Get test country job position
    testCountryJobPositionId = await getTestCountryJobPositionId(prisma);

    // Get test sector
    const sector = await prisma.countrySector.findFirst({
      select: { id: true },
    });
    if (!sector) {
      throw new Error("No sector found in database");
    }
    testSectorId = sector.id;

    // Get test subsector
    const subsector = await prisma.countrySubsector.findFirst({
      where: { countrySectorId: testSectorId },
      select: { id: true },
    });
    if (!subsector) {
      throw new Error("No subsector found in database");
    }
    testSubsectorId = subsector.id;

    // Get test main activity
    const mainActivity = await prisma.organizationMainActivity.findFirst({
      select: { id: true },
    });
    if (!mainActivity) {
      throw new Error("No main activity found in database");
    }
    testMainActivityId = mainActivity.id;

    // Get test country organization size
    const countryOrganizationSize =
      await prisma.countryOrganizationSize.findFirst({
        select: { id: true },
      });
    if (!countryOrganizationSize) {
      throw new Error("No country organization size found in database");
    }
    testCountryOrganizationSizeId = countryOrganizationSize.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  const getValidUpdateData = () => ({
    legalName: "Updated Legal Name",
    tradeName: "Updated Trade Name",
    taxId: "UPDATE-TAX-123",
    countryOrganizationSizeId: testCountryOrganizationSizeId.toString(),
    sectorId: testSectorId.toString(),
    subsectorId: testSubsectorId.toString(),
    employeesCount: 150,
    address: "123 Updated Street",
    representativeFullName: "Jane Updated",
    representativeTaxId: "REP-UPDATE-456",
    representativePositionId: testCountryJobPositionId.toString(),
    representativePhone: "+9876543210",
    representativeEmail: "updated@example.com",
    mainActivityId: testMainActivityId.toString(),
  });

  const createMembership = async (organizationId: bigint) => {
    await createTestMembership(prisma, testUserId, organizationId, {
      status: MembershipStatus.ACTIVE,
    });
  };

  describe("Successful updates", () => {
    it("should successfully update draft organization data (no submission)", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Name",
        tradeName: "Original Trade",
      });
      await createMembership(org.id);

      const updateData = getValidUpdateData();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateOrganizationResponse;
      expect(body).toEqual({});

      // Verify the existing organization data was updated in place
      const updatedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedOrgData).toBeTruthy();
      expect(updatedOrgData!.legalName).toBe(updateData.legalName);
      expect(updatedOrgData!.tradeName).toBe(updateData.tradeName);
      expect(updatedOrgData!.taxId).toBe(updateData.taxId);
      expect(updatedOrgData!.employeesCount).toBe(updateData.employeesCount);
      expect(updatedOrgData!.address).toBe(updateData.address);
      expect(updatedOrgData!.representativeFullName).toBe(
        updateData.representativeFullName
      );
      expect(updatedOrgData!.representativeTaxId).toBe(
        updateData.representativeTaxId
      );
      expect(updatedOrgData!.representativePhone).toBe(
        updateData.representativePhone
      );
      expect(updatedOrgData!.representativeEmail).toBe(
        updateData.representativeEmail
      );

      // Verify no new organization data was created
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
      });
      expect(allOrgData).toHaveLength(1);
    });

    it("should create new organization data and submission for approved organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED
      );
      await createMembership(org.id);

      const updateData = getValidUpdateData();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateOrganizationResponse;
      expect(body).toEqual({});

      // Verify original organization data is unchanged
      const originalOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });
      expect(originalOrgData!.legalName).toBe("Approved Name");

      // Verify new organization data was created
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "asc" },
      });
      expect(allOrgData).toHaveLength(2);

      const newOrgData = allOrgData[1];
      expect(newOrgData.legalName).toBe(updateData.legalName);
      expect(newOrgData.tradeName).toBe(updateData.tradeName);
      expect(newOrgData.status).toBe(OrganizationDataStatus.ACTIVE);

      // Verify new submission was created for the new organization data
      const newSubmission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: newOrgData.id,
            },
          },
        },
      });
      expect(newSubmission).toBeTruthy();
      expect(newSubmission!.status).toBe(SubmissionStatus.PENDING);
    });

    it("should update all fields correctly", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const updateData = getValidUpdateData();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);

      const updatedOrgData = await prisma.organizationData.findFirst({
        where: { organizationId: org.id },
      });

      expect(updatedOrgData!.countryOrganizationSizeId).toBe(
        testCountryOrganizationSizeId
      );
      expect(updatedOrgData!.sectorId).toBe(testSectorId);
      expect(updatedOrgData!.subsectorId).toBe(testSubsectorId);
      expect(updatedOrgData!.mainActivityId).toBe(testMainActivityId);
      expect(updatedOrgData!.representativeCountryJobPositionId).toBe(
        testCountryJobPositionId
      );
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid email format", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const invalidData = {
        ...getValidUpdateData(),
        representativeEmail: "not-an-email",
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty required string fields", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const invalidData = {
        ...getValidUpdateData(),
        legalName: "",
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for non-integer employeesCount", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const invalidData = {
        ...getValidUpdateData(),
        employeesCount: 150.5,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid organization ID format", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/app/organizations/invalid-id",
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("State transitions", () => {
    it("should not allow update when organization has pending submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING
      );
      await createMembership(org.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should allow update for rejected organization data", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Rejected Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED
      );
      await createMembership(org.id);

      // After rejection, the service should treat this as needing a new submission
      // First, let's check if the rejected data can be found
      const rejectedData = await prisma.organizationData.findUnique({
        where: {
          id: orgData.id,
          status: OrganizationDataStatus.ACTIVE,
          submission: {
            subject: {
              submissions: {
                some: {
                  status: SubmissionStatus.REJECTED,
                },
              },
            },
          },
        },
      });

      // The service logic doesn't handle rejected case explicitly,
      // so it will be treated as neither draft nor approved
      const updateData = getValidUpdateData();
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should not create new submission for draft without existing submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(200);

      // Verify no submission was created
      const submissions = await prisma.submission.findMany({
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
      expect(submissions).toHaveLength(0);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent organization", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/app/organizations/999999999",
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 403 when user has no membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      // No membership created

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 403 when user has deleted membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await prisma.userOrganizationMembership.create({
        data: {
          userId: testUserId,
          organizationId: org.id,
          organizationRoleId: testOrganizationRoleId,
          status: MembershipStatus.DELETED,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });
  });

  describe("Data consistency", () => {
    it("should preserve original data when updating draft", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original",
        tradeName: "Original Trade",
      });
      await createMembership(org.id);

      const originalCreatedAt = orgData.createdAt;

      const updateData = getValidUpdateData();
      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      const updatedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      // Should be same record (same ID, same createdAt)
      expect(updatedOrgData!.id).toBe(orgData.id);
      expect(updatedOrgData!.createdAt.getTime()).toBe(
        originalCreatedAt.getTime()
      );
      // But updatedAt should change
      expect(updatedOrgData!.updatedAt.getTime()).toBeGreaterThan(
        originalCreatedAt.getTime()
      );
    });

    it("should not affect other organizations when updating one", async () => {
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData1 = await createTestOrganizationData(prisma, org1.id, {
        legalName: "Org 1",
      });
      await createMembership(org1.id);

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData2 = await createTestOrganizationData(prisma, org2.id, {
        legalName: "Org 2",
      });

      // Update org1
      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org1.id.toString()}`,
        payload: getValidUpdateData(),
      });

      // Verify org2 is unchanged
      const org2DataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData2.id },
      });
      expect(org2DataCheck!.legalName).toBe("Org 2");
    });

    it("should update timestamps correctly", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      const beforeUpdate = new Date();

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      const afterUpdate = new Date();

      const updatedOrgData = await prisma.organizationData.findFirst({
        where: { organizationId: org.id },
      });

      const updatedAt = new Date(updatedOrgData!.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it("should preserve organization status when updating data", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      const orgCheck = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(orgCheck!.status).toBe(OrganizationStatus.ACTIVE);
    });
  });

  describe("Partial updates", () => {
    it("should update only changed fields in draft", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Name",
        tradeName: "Original Trade",
        taxId: "ORIGINAL-123",
      });
      await createMembership(org.id);

      // Update with different values
      const partialUpdate = {
        ...getValidUpdateData(),
        legalName: "New Name",
      };

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: partialUpdate,
      });

      const updatedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedOrgData!.legalName).toBe("New Name");
      expect(updatedOrgData!.tradeName).toBe(partialUpdate.tradeName);
      expect(updatedOrgData!.taxId).toBe(partialUpdate.taxId);
    });

    it("should handle multiple sequential updates to draft", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);
      await createMembership(org.id);

      // First update
      const firstUpdate = {
        ...getValidUpdateData(),
        legalName: "First Update",
      };
      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: firstUpdate,
      });

      // Second update
      const secondUpdate = {
        ...getValidUpdateData(),
        legalName: "Second Update",
      };
      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: secondUpdate,
      });

      // Should still have only one organization data record
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
      });
      expect(allOrgData).toHaveLength(1);
      expect(allOrgData[0].legalName).toBe("Second Update");
    });
  });

  describe("Versioning for approved data", () => {
    it("should keep approved data intact and create new version", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const approvedOrgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Name",
        tradeName: "Approved Trade",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedOrgData.id,
        SubmissionStatus.APPROVED
      );
      await createMembership(org.id);

      const updateData = getValidUpdateData();
      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateData,
      });

      // Verify approved data is untouched
      const approvedCheck = await prisma.organizationData.findUnique({
        where: { id: approvedOrgData.id },
      });
      expect(approvedCheck!.legalName).toBe("Approved Name");
      expect(approvedCheck!.tradeName).toBe("Approved Trade");

      // Verify new version exists
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
      });
      expect(allOrgData).toHaveLength(2);
    });

    it("should create submission with PENDING status for new version", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const approvedOrgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        approvedOrgData.id,
        SubmissionStatus.APPROVED
      );
      await createMembership(org.id);

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateData(),
      });

      // Get the new organization data
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "asc" },
      });
      const newOrgData = allOrgData[1];

      // Verify new submission
      const newSubmission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: newOrgData.id,
            },
          },
        },
      });

      expect(newSubmission).toBeTruthy();
      expect(newSubmission!.status).toBe(SubmissionStatus.PENDING);
    });
  });
});
