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
import type { GetOrganizationKpisResponse } from "@repo/types";
import {
  OrganizationDataStatus,
  OrganizationStatus,
  SubmissionStatus,
} from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";

describe("GET /api/admin/organizations/kpis - Integration Tests", () => {
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
    it("should return organization KPIs with all required fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body).toBeDefined();
      expect(body.total).toBeDefined();
      expect(body.counts).toBeDefined();
      expect(body.counts.length).toBe(8);
    });

    it("should return zero counts when no organizations exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(0);
    });

    it("should count organizations by status correctly", async () => {
      // Create ACTIVE organizations
      const activeOrg1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg1.id);

      const activeOrg2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg2.id);

      // Create BLOCKED organization
      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const activeSum = body.counts.reduce(
        (acc, curr) =>
          acc + (curr.status === OrganizationStatus.ACTIVE ? curr.count : 0),
        0
      );

      const blockedSum = body.counts.reduce(
        (acc, curr) =>
          acc + (curr.status === OrganizationStatus.BLOCKED ? curr.count : 0),
        0
      );

      expect(body.total).toBe(3);
      expect(activeSum).toBe(2);
      expect(blockedSum).toBe(1);
      expect(activeSum + blockedSum).toBe(body.total);
    });

    it("should count organizations by accreditation status correctly", async () => {
      // Create DRAFT organization
      const draftOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, draftOrg.id);

      // Create UNDER_REVIEW organization
      const reviewOrg = await createTestOrganization(prisma);
      const reviewOrgData = await createTestOrganizationData(
        prisma,
        reviewOrg.id
      );
      await createTestOrganizationDataSubmission(
        prisma,
        reviewOrgData.id,
        "PENDING"
      );

      // Create ACCREDITED organization
      const accreditedOrg = await createTestOrganization(prisma);
      const accreditedOrgData = await createTestOrganizationData(
        prisma,
        accreditedOrg.id
      );
      await createTestOrganizationDataSubmission(
        prisma,
        accreditedOrgData.id,
        "APPROVED"
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const accreditedSum = body.counts.reduce(
        (acc, curr) => acc + (curr.accredited ? curr.count : 0),
        0
      );
      const notAccreditedSum = body.counts.reduce(
        (acc, curr) => acc + (!curr.accredited ? curr.count : 0),
        0
      );

      expect(accreditedSum).toBe(1);
      expect(notAccreditedSum).toBe(2);
      expect(accreditedSum + notAccreditedSum).toBe(body.total);
    });

    it("should include total organization count", async () => {
      // Create 5 organizations
      for (let i = 0; i < 5; i++) {
        const org = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, org.id);
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(5);
    });

    it("should correctly categorize mixed organization states", async () => {
      // ACTIVE + DRAFT
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org1.id);

      // ACTIVE + ACCREDITED
      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const org2Data = await createTestOrganizationData(prisma, org2.id);
      await createTestOrganizationDataSubmission(
        prisma,
        org2Data.id,
        SubmissionStatus.APPROVED
      );

      // BLOCKED + ACCREDITED
      const org3 = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const org3Data = await createTestOrganizationData(prisma, org3.id);
      await createTestOrganizationDataSubmission(
        prisma,
        org3Data.id,
        SubmissionStatus.APPROVED
      );

      // BLOCKED + DRAFT
      const org4 = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org4.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const activeSum = body.counts.reduce(
        (acc, curr) =>
          acc + (curr.status === OrganizationStatus.ACTIVE ? curr.count : 0),
        0
      );
      const blockedSum = body.counts.reduce(
        (acc, curr) =>
          acc + (curr.status === OrganizationStatus.BLOCKED ? curr.count : 0),
        0
      );
      const accreditedSum = body.counts.reduce(
        (acc, curr) => acc + (curr.accredited ? curr.count : 0),
        0
      );
      const notAccreditedSum = body.counts.reduce(
        (acc, curr) => acc + (!curr.accredited ? curr.count : 0),
        0
      );

      expect(activeSum).toBe(2);
      expect(blockedSum).toBe(2);
      expect(accreditedSum).toBe(2);
      expect(notAccreditedSum).toBe(2);
      expect(activeSum + blockedSum).toBe(body.total);
      expect(accreditedSum + notAccreditedSum).toBe(body.total);
      expect(response.statusCode).toBe(200);

      expect(body.total).toBe(4);
    });
  });

  describe("Edge cases", () => {
    it("should handle organizations with only OUTDATED data", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        status: "OUTDATED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(0);
    });

    it("should handle organization with multiple submissions (rejected history)", async () => {
      const org = await createTestOrganization(prisma);
      const orgData1 = await createTestOrganizationData(prisma, org.id);

      // Create and reject first submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData1.id,
        SubmissionStatus.REJECTED
      );

      // Mark first data as OUTDATED after rejection
      await prisma.organizationData.update({
        where: { id: orgData1.id },
        data: { status: OrganizationDataStatus.OUTDATED },
      });

      // Create new data and submit again
      const orgData2 = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData2.id,
        SubmissionStatus.APPROVED
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const accreditedSum = body.counts.reduce(
        (acc, curr) => acc + (curr.accredited ? curr.count : 0),
        0
      );
      expect(accreditedSum).toBe(1);
    });

    describe("KPI structure", () => {
      it("should have counts that sum correctly", async () => {
        // Create various organizations
        const org1 = await createTestOrganization(prisma, {
          status: OrganizationStatus.ACTIVE,
        });
        await createTestOrganizationData(prisma, org1.id);

        const org2 = await createTestOrganization(prisma, {
          status: OrganizationStatus.BLOCKED,
        });
        await createTestOrganizationData(prisma, org2.id);

        const org3 = await createTestOrganization(prisma, {
          status: OrganizationStatus.ACTIVE,
        });
        const org3Data = await createTestOrganizationData(prisma, org3.id);
        await createTestOrganizationDataSubmission(
          prisma,
          org3Data.id,
          SubmissionStatus.APPROVED
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/kpis",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

        // Sum of active and blocked organizations should equal total
        const statusSum = body.counts.reduce(
          (acc, curr) => acc + curr.count,
          0
        );
        expect(statusSum).toBe(body.total);

        // Sum of accredited organizations should equal 1
        const accreditationSum = body.counts.reduce(
          (acc, curr) => acc + (curr.accredited ? curr.count : 0),
          0
        );
        expect(accreditationSum).toBe(1);

        // Sum of not_accredited organizations should equal 2
        const notAccreditedSum = body.counts.reduce(
          (acc, curr) => acc + (!curr.accredited ? curr.count : 0),
          0
        );
        expect(notAccreditedSum).toBe(2);
      });
    });
  });
});
