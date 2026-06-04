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
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
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
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { getTestCountryJobPositionId } from "@test/factories/jobPositionFactory.js";
import {
  createTestFile,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";

describe("PATCH /api/app/organizations/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let sectorId: bigint;
  let subsectorId: bigint;
  let mainActivityId: bigint;
  let countryOrganizationSizeId: bigint;
  let representativePositionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
      storageDescriptor: inject("storageDescriptor"),
    });
    // Tests assert DB state, not real blob movement; stub copy/delete so they
    // pass without first uploading a fixture (the original suite mocked these
    // out at the module level — that module no longer exists).
    vi.spyOn(app.storage, "copyObject").mockResolvedValue(undefined);
    vi.spyOn(app.storage, "deleteObject").mockResolvedValue(undefined);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);

    // Get test data IDs
    const sector = await prisma.countrySector.findFirst({
      select: { id: true },
    });
    const subsector = await prisma.countrySubsector.findFirst({
      select: { id: true },
    });
    const mainActivity = await prisma.organizationMainActivity.findFirst({
      select: { id: true },
    });
    const size = await prisma.countryOrganizationSize.findFirst({
      select: { id: true },
    });

    if (!sector || !subsector || !mainActivity || !size) {
      throw new Error(
        "Missing test data in database. Please ensure the database is properly seeded."
      );
    }

    sectorId = sector.id;
    subsectorId = subsector.id;
    mainActivityId = mainActivity.id;
    countryOrganizationSizeId = size.id;
    representativePositionId = await getTestCountryJobPositionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupTestOrganization(prisma);
  });

  const getValidUpdateBody = () => ({
    legalName: "Updated Legal Name",
    tradeName: "Updated Trade Name",
    taxId: "TAX-12345-UPDATED",
    countryOrganizationSizeId: countryOrganizationSizeId.toString(),
    sectorId: sectorId.toString(),
    subsectorId: subsectorId.toString(),
    employeesCount: 100,
    address: "123 Updated Street, City",
    representativeFullName: "John Updated Doe",
    representativeTaxId: "REP-TAX-12345",
    representativePositionId: representativePositionId.toString(),
    representativePhone: "+1234567890",
    representativeEmail: "updated@example.com",
    mainActivityId: mainActivityId.toString(),
  });

  describe("Successful updates", () => {
    it("should update organization with draft data in-place", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // Create draft organization data (no submission)
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Legal Name",
      });

      // Create membership for test user
      await createTestMembership(prisma, testUser.id, org.id);

      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateOrganizationResponse;
      expect(body).toEqual({ id: org.id.toString() });

      // Verify the draft was updated in-place
      const updatedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedOrgData!.legalName).toBe("Updated Legal Name");
      expect(updatedOrgData!.tradeName).toBe("Updated Trade Name");
      expect(updatedOrgData!.taxId).toBe("TAX-12345-UPDATED");
      expect(updatedOrgData!.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(updatedOrgData!.updatedById).toBe(testUser.id);

      // Verify no new organization_data was created
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
      });
      expect(allOrgData).toHaveLength(1);
    });

    it("should create new ACTIVE data with PENDING submission when updating approved organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // Create approved organization data
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Approved Name",
        status: OrganizationDataStatus.ACTIVE,
      });

      // Create approved submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      await createTestMembership(prisma, testUser.id, org.id);

      // Create test files for the submission
      const file1 = await createTestFile(prisma, testUser.id, {
        originalName: "test-document-1.pdf",
      });
      const file2 = await createTestFile(prisma, testUser.id, {
        originalName: "test-document-2.pdf",
      });

      const updateBody = {
        ...getValidUpdateBody(),
        fileUuids: [file1.uuid, file2.uuid],
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateOrganizationResponse;
      expect(body).toEqual({ id: org.id.toString() });

      // Verify old APPROVED data remains ACTIVE and unchanged
      const oldOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });
      expect(oldOrgData!.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(oldOrgData!.legalName).toBe("Original Approved Name");

      // Verify new ACTIVE data was created
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
      });

      expect(allOrgData).toHaveLength(2);

      const newData = allOrgData[0];
      expect(newData.id).not.toBe(orgData.id);
      expect(newData.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(newData.legalName).toBe("Updated Legal Name");
      expect(newData.createdById).toBe(testUser.id);

      // Verify new data has a PENDING submission immediately
      const newSubmission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: newData.id,
            },
          },
        },
      });
      expect(newSubmission).toBeTruthy();
      expect(newSubmission!.status).toBe(SubmissionStatus.PENDING);

      const submissionFiles = await prisma.submissionFile.findMany({
        where: { submissionId: newSubmission!.id },
        include: { file: { select: { uuid: true } } },
      });
      expect(submissionFiles).toHaveLength(2);
      expect(submissionFiles.map((sf) => sf.file.uuid).sort()).toEqual(
        [file1.uuid, file2.uuid].sort()
      );

      // Verify both old and new data are ACTIVE
      const activeData = await prisma.organizationData.findMany({
        where: {
          organizationId: org.id,
          status: OrganizationDataStatus.ACTIVE,
        },
      });
      expect(activeData).toHaveLength(2);
    });

    it("should create new ACTIVE draft when updating reviewed organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // Create reviewed organization data
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Reviewed Name",
        status: OrganizationDataStatus.ACTIVE,
      });

      // Create reviewed submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REVIEWED,
        testUser.id,
        testUser.id,
        "Reviewed for testing"
      );

      await createTestMembership(prisma, testUser.id, org.id);

      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateOrganizationResponse;
      expect(body).toEqual({ id: org.id.toString() });

      // Verify old REVIEWED data remains ACTIVE
      const oldOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });
      expect(oldOrgData!.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(oldOrgData!.legalName).toBe("Original Reviewed Name");

      // Verify new ACTIVE draft was created
      const allOrgData = await prisma.organizationData.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
      });

      expect(allOrgData).toHaveLength(2);

      const newDraft = allOrgData[0];
      expect(newDraft.id).not.toBe(orgData.id);
      expect(newDraft.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(newDraft.legalName).toBe("Updated Legal Name");
      expect(newDraft.createdById).toBe(testUser.id);

      // Verify new draft does NOT have a submission (rejected flow creates draft only)
      const newSubmission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: newDraft.id,
            },
          },
        },
      });
      expect(newSubmission).toBeNull();

      // Verify both old rejected and new draft are ACTIVE
      const activeData = await prisma.organizationData.findMany({
        where: {
          organizationId: org.id,
          status: OrganizationDataStatus.ACTIVE,
        },
      });
      expect(activeData).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("should return 403 for non-existent organization", async () => {
      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/app/organizations/999999999",
        payload: updateBody,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBeTruthy();
    });

    it("should return 403 for user without membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      // No membership created

      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBeTruthy();
    });

    it("should return 403 for user with deleted membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);

      // Create deleted membership
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.DELETED,
      });

      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBeTruthy();
    });

    it("should return 409 with ORGANIZATION_UNDER_REVIEW for organization with pending submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const orgData = await createTestOrganizationData(prisma, org.id);

      // Create pending submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      await createTestMembership(prisma, testUser.id, org.id);

      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_UNDER_REVIEW");
      expect(body.message).toBeTruthy();
    });

    it("should return 400 FILE_ATTACHMENTS_REQUIRED when updating accredited org without files", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: getValidUpdateBody(),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_ATTACHMENTS_REQUIRED");
    });

    it("should return 400 for invalid organization ID format", async () => {
      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/app/organizations/invalid-id",
        payload: updateBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative organization ID", async () => {
      const updateBody = getValidUpdateBody();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/app/organizations/-1",
        payload: updateBody,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Validation", () => {
    it("should return 400 for missing required field (legalName)", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const invalidBody = {
        ...getValidUpdateBody(),
        legalName: undefined,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid email format", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const invalidBody = {
        ...getValidUpdateBody(),
        representativeEmail: "not-an-email",
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty string fields", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const invalidBody = {
        ...getValidUpdateBody(),
        legalName: "",
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid employeesCount (non-integer)", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const invalidBody = {
        ...getValidUpdateBody(),
        employeesCount: 3.14, // Non-integer
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const invalidBody = {
        ...getValidUpdateBody(),
        sectorId: "not-a-number",
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: invalidBody,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Data integrity", () => {
    it("should preserve updatedById in organization data", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const updateBody = getValidUpdateBody();

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      const updatedData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedData!.updatedById).toBe(testUser.id);
    });

    it("should preserve original data when creating new draft", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Name",
        tradeName: "Original Trade",
        taxId: "ORIGINAL-TAX",
      });

      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      await createTestMembership(prisma, testUser.id, org.id);

      const updateBody = getValidUpdateBody();

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      // Verify original data unchanged
      const originalData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(originalData!.legalName).toBe("Original Name");
      expect(originalData!.tradeName).toBe("Original Trade");
      expect(originalData!.taxId).toBe("ORIGINAL-TAX");
    });

    it("should not affect other organizations", async () => {
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, org1.id, {
        legalName: "Organization 1",
      });
      const org2Data = await createTestOrganizationData(prisma, org2.id, {
        legalName: "Organization 2",
      });

      await createTestMembership(prisma, testUser.id, org1.id);

      const updateBody = getValidUpdateBody();

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org1.id.toString()}`,
        payload: updateBody,
      });

      // Verify org1 data updated
      const org1DataCheck = await prisma.organizationData.findFirst({
        where: { organizationId: org1.id },
      });
      expect(org1DataCheck!.legalName).toBe("Updated Legal Name");

      // Verify org2 data unchanged
      const org2DataCheck = await prisma.organizationData.findUnique({
        where: { id: org2Data.id },
      });

      expect(org2DataCheck!.legalName).toBe("Organization 2");
    });

    it("should update timestamps correctly", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const beforeUpdate = new Date();

      const updateBody = getValidUpdateBody();

      await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${org.id.toString()}`,
        payload: updateBody,
      });

      const updatedData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(updatedData!.updatedAt).toBeTruthy();
      const updatedAt = new Date(updatedData!.updatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
    });
  });
});
