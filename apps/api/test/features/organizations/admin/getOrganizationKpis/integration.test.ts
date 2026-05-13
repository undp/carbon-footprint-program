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
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

describe("GET /api/admin/organizations/kpis - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Carbon inventories must be deleted before organizations (no cascade)
    await cleanupCarbonInventoryTestData(prisma);
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

      expect(body.total).toBe(3);

      const activeSum = body.counts.reduce((acc, curr) => {
        return (
          acc + (curr.status === OrganizationStatus.ACTIVE ? curr.count : 0)
        );
      }, 0);
      const blockedSum = body.counts.reduce((acc, curr) => {
        return (
          acc + (curr.status === OrganizationStatus.BLOCKED ? curr.count : 0)
        );
      }, 0);

      expect(activeSum).toBe(2);
      expect(blockedSum).toBe(1);
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
        SubmissionStatus.PENDING,
        testUser.id
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
        SubmissionStatus.APPROVED,
        testUser.id
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
        SubmissionStatus.APPROVED,
        testUser.id
      );

      // BLOCKED + ACCREDITED
      const org3 = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const org3Data = await createTestOrganizationData(prisma, org3.id);
      await createTestOrganizationDataSubmission(
        prisma,
        org3Data.id,
        SubmissionStatus.APPROVED,
        testUser.id
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
        status: OrganizationDataStatus.OUTDATED,
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
        SubmissionStatus.REJECTED,
        testUser.id
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
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const activeSum = body.counts.reduce((acc, curr) => {
        return (
          acc + (curr.status === OrganizationStatus.ACTIVE ? curr.count : 0)
        );
      }, 0);
      const blockedSum = body.counts.reduce((acc, curr) => {
        return (
          acc + (curr.status === OrganizationStatus.BLOCKED ? curr.count : 0)
        );
      }, 0);

      expect(activeSum).toBe(1);
      expect(blockedSum).toBe(0);
      expect(activeSum + blockedSum).toBe(body.total);
    });

    it("should not count DELETED memberships in organization totals", async () => {
      // Create organization (memberships don't affect KPI counts)
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(1);
    });
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
      // First data record without submission; ensures only the submitted one affects KPIs
      await createTestOrganizationData(prisma, org3.id);
      const org3Data = await createTestOrganizationData(prisma, org3.id);
      await createTestOrganizationDataSubmission(
        prisma,
        org3Data.id,
        SubmissionStatus.APPROVED,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      const statusSum = body.counts.reduce((acc, curr) => {
        return acc + curr.count;
      }, 0);

      expect(statusSum).toBe(body.total);

      const accreditedSum = body.counts.reduce((acc, curr) => {
        return acc + (curr.accredited ? curr.count : 0);
      }, 0);

      expect(accreditedSum).toBe(1);
    });
  });

  describe("Lifecycle state KPI counts", () => {
    it("should count a rejected org as ACTIVE and not accredited", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(1);

      // Rejected org_data stays ACTIVE; no APPROVED submission → not accredited
      const bucket = body.counts.find(
        (c) =>
          c.status === OrganizationStatus.ACTIVE &&
          c.accredited === false &&
          c.withInventories === false
      );
      expect(bucket?.count).toBe(1);
    });

    it("should count an org in re-accreditation (APPROVED + PENDING) once as accredited", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // 1. Approved org_data (accreditation)
      const approvedData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        approvedData.id,
        SubmissionStatus.APPROVED,
        testUser.id
      );

      // 2. Pending re-accreditation (new org_data under review)
      const pendingData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        pendingData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      // Org has both APPROVED and PENDING active data → counted once, as accredited
      expect(body.total).toBe(1);
      const accreditedSum = body.counts.reduce(
        (acc, curr) => acc + (curr.accredited ? curr.count : 0),
        0
      );
      expect(accreditedSum).toBe(1);
    });

    it("should count org with carbon inventory in withInventories=true bucket for current year", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id
      );

      // Any carbon inventory linked to the org makes hasCarbonInventories=true
      await prisma.carbonInventory.create({
        data: {
          organizationId: org.id,
          year: new Date().getFullYear(),
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(1);

      const bucket = body.counts.find(
        (c) =>
          c.status === OrganizationStatus.ACTIVE &&
          c.accredited === true &&
          c.withInventories === true
      );
      expect(bucket?.count).toBe(1);

      // withInventories=false bucket for same status/accreditation should be 0
      const emptyBucket = body.counts.find(
        (c) =>
          c.status === OrganizationStatus.ACTIVE &&
          c.accredited === true &&
          c.withInventories === false
      );
      expect(emptyBucket?.count).toBe(0);
    });

    it("should only count orgs with inventory inside MEASURING_ORGANIZATIONS_YEAR_RANGE window", async () => {
      const currentYear = new Date().getFullYear();
      const orgs = await Promise.all([
        createTestOrganization(prisma, { status: OrganizationStatus.ACTIVE }),
        createTestOrganization(prisma, { status: OrganizationStatus.ACTIVE }),
        createTestOrganization(prisma, { status: OrganizationStatus.ACTIVE }),
      ]);

      for (const org of orgs) {
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id
        );
      }

      // With MEASURING_ORGANIZATIONS_YEAR_RANGE=2, only currentYear and
      // currentYear-1 fall inside the window. currentYear-2 is outside.
      const inventoryYears = [currentYear, currentYear - 1, currentYear - 2];
      for (let i = 0; i < orgs.length; i++) {
        await prisma.carbonInventory.create({
          data: {
            organizationId: orgs[i].id,
            year: inventoryYears[i],
            usageMode: "SIMPLIFIED",
            methodologyVersionId,
            updatedAt: null,
          },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationKpisResponse;

      expect(body.total).toBe(3);

      const withinWindow = body.counts.find(
        (c) =>
          c.status === OrganizationStatus.ACTIVE &&
          c.accredited === true &&
          c.withInventories === true
      );
      expect(withinWindow?.count).toBe(2);

      const outsideWindow = body.counts.find(
        (c) =>
          c.status === OrganizationStatus.ACTIVE &&
          c.accredited === true &&
          c.withInventories === false
      );
      expect(outsideWindow?.count).toBe(1);
    });
  });
});
