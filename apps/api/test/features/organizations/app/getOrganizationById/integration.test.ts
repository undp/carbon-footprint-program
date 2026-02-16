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
import { OrganizationStatus, SubmissionStatus } from "@repo/database";
import type { GetOrganizationByIdResponse } from "@repo/types";
import { OrganizationDisplayStatusValues } from "@repo/types";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";

describe("GET /api/app/organizations/:id - Integration Tests", () => {
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

  describe("Successful retrieval", () => {
    it("should retrieve organization by valid ID", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "TestOrg",
        taxId: "TAX-123456",
        address: "123 Test Street",
        employeesCount: 50,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.id).toBe(org.id.toString());
      expect(body.legalName).toBe("Test Organization");
      expect(body.tradeName).toBe("TestOrg");
      expect(body.taxId).toBe("TAX-123456");
      expect(body.address).toBe("123 Test Street");
      expect(body.employeeCount).toBe(50);
      expect(body.status).toBe(OrganizationDisplayStatusValues.NOT_ACCREDITED);
      expect(body.representative).toBeDefined();
      expect(body.representative.fullName).toBe(orgData.representativeFullName);
      expect(body.representative.taxId).toBe(orgData.representativeTaxId);
      expect(body.representative.email).toBe(orgData.representativeEmail);
      expect(body.representative.phone).toBe(orgData.representativePhone);
      expect(body.representative.position).toBeDefined();
      expect(body.representative.position.id).toBe(
        orgData.representativeCountryJobPositionId.toString()
      );
    });

    it("should retrieve organization with all optional fields null", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: null,
        sectorId: null,
        subsectorId: null,
        countryOrganizationSizeId: null,
        mainActivityId: null,
        address: null,
        employeesCount: null,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.id).toBe(org.id.toString());
      expect(body.tradeName).toBeNull();
      expect(body.sector).toBeNull();
      expect(body.subsector).toBeNull();
      expect(body.countryOrganizationSize).toBeNull();
      expect(body.mainActivity).toBeNull();
      expect(body.address).toBeNull();
      expect(body.employeeCount).toBeNull();
    });

    it("should include name from legalName or tradeName", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Legal Name Inc",
        tradeName: "Trade Name",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      // The view uses COALESCE(trade_name, legal_name) for name
      expect(body.name).toBeDefined();
      expect(typeof body.name).toBe("string");
    });
  });

  describe("Organization statuses", () => {
    it("should return NOT_ACCREDITED status for ACTIVE organization without submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      expect(body.status).toBe(OrganizationDisplayStatusValues.NOT_ACCREDITED);
    });

    it("should return NOT_ACCREDITED status for ACTIVE organization with PENDING submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      expect(body.status).toBe(OrganizationDisplayStatusValues.NOT_ACCREDITED);
    });

    it("should return NOT_ACCREDITED status for ACTIVE organization with REJECTED submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      expect(body.status).toBe(OrganizationDisplayStatusValues.NOT_ACCREDITED);
    });

    it("should return ACCREDITED status for ACTIVE organization with APPROVED submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      expect(body.status).toBe(OrganizationDisplayStatusValues.ACCREDITED);
    });

    it("should return BLOCKED status for BLOCKED organization without submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      expect(body.status).toBe(OrganizationDisplayStatusValues.BLOCKED);
    });

    it("should return BLOCKED status for BLOCKED organization with APPROVED submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;
      // BLOCKED status takes precedence over APPROVED
      expect(body.status).toBe(OrganizationDisplayStatusValues.BLOCKED);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent organization ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/invalid-id",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for negative organization ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/-1",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 for zero organization ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/0",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for decimal organization ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/123.456",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Data consistency", () => {
    it("should preserve BigInt IDs as strings in response", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      // Verify ID is string, not number
      expect(typeof body.id).toBe("string");
      expect(body.id).toBe(org.id.toString());

      // Verify nested IDs are also strings
      if (body.representative.position) {
        expect(typeof body.representative.position.id).toBe("string");
      }
    });

    it("should return complete representative information", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        representativeFullName: "John Doe",
        representativeTaxId: "REP-TAX-123",
        representativeEmail: "john.doe@example.com",
        representativePhone: "+1234567890",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.representative.fullName).toBe("John Doe");
      expect(body.representative.taxId).toBe("REP-TAX-123");
      expect(body.representative.email).toBe("john.doe@example.com");
      expect(body.representative.phone).toBe("+1234567890");
      expect(body.representative.position).toBeDefined();
      expect(body.representative.position.id).toBe(
        orgData.representativeCountryJobPositionId.toString()
      );
      expect(body.representative.position.name).toBeTruthy();
    });

    describe("Entity references", () => {
      it("should include entity reference format for related entities", async () => {
        const org = await createTestOrganization(prisma, {
          status: OrganizationStatus.ACTIVE,
        });
        await createTestOrganizationData(prisma, org.id);

        const response = await app.inject({
          method: "GET",
          url: `/api/app/organizations/${org.id.toString()}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

        // Representative position is always present
        expect(body.representative.position).toBeDefined();
        expect(body.representative.position.id).toBeTruthy();
        expect(body.representative.position.name).toBeTruthy();

        // Optional references should be null or have both id and name
        if (body.sector !== null) {
          expect(body.sector.id).toBeTruthy();
          expect(body.sector.name).toBeTruthy();
        }

        if (body.subsector !== null) {
          expect(body.subsector.id).toBeTruthy();
          expect(body.subsector.name).toBeTruthy();
        }

        if (body.countryOrganizationSize !== null) {
          expect(body.countryOrganizationSize.id).toBeTruthy();
          expect(body.countryOrganizationSize.name).toBeTruthy();
        }

        if (body.mainActivity !== null) {
          expect(body.mainActivity.id).toBeTruthy();
          expect(body.mainActivity.name).toBeTruthy();
        }
      });
    });
  });
});
