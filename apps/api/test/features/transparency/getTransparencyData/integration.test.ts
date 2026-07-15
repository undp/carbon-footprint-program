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
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  createTestOrganizationDataSubmission,
  createTestCarbonInventorySubmission,
} from "@test/factories/submissionFactory.js";
import { createCarbonInventory } from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import {
  createTestReductionProject,
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import type { GetTransparencyDataResponse } from "@repo/types";
import { InventoryStatus } from "@repo/types";
import {
  SubmissionStatus,
  SubmissionType,
  OrganizationStatus,
  OrganizationDataStatus,
} from "@repo/database";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/transparency - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;
  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupReductionProjectTestData(prisma);
  });

  /**
   * Builds an ACTIVE organization with an APPROVED accreditation submission, so
   * it appears in `organization_summary_view` with `isAccredited = true`.
   */
  async function createAccreditedOrganization(overrides?: {
    sectorId?: bigint;
    subsectorId?: bigint;
    tradeName?: string;
  }) {
    const org = await createTestOrganization(prisma, {
      status: OrganizationStatus.ACTIVE,
    });
    const orgData = await createTestOrganizationData(prisma, org.id, {
      status: OrganizationDataStatus.ACTIVE,
      tradeName: overrides?.tradeName ?? `Transparency Org ${org.id}`,
      sectorId: overrides?.sectorId ?? null,
      subsectorId: overrides?.subsectorId ?? null,
    });
    await createTestOrganizationDataSubmission(
      prisma,
      orgData.id,
      SubmissionStatus.APPROVED,
      testUserId
    );
    return { org, orgData };
  }

  describe("Public access and empty states", () => {
    it("should return an empty array when there are no accredited organizations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetTransparencyDataResponse;
      expect(body).toEqual([]);
    });

    it("should not require authentication (public endpoint)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Sector/subsector, year filter, and recognitions", () => {
    it("should return the organization with sector/subsector names and the CI's own recognition", async () => {
      const sector = await createTestCountrySector(prisma);
      const subsector = await createTestCountrySubsector(prisma, sector.id);
      const { org } = await createAccreditedOrganization({
        sectorId: sector.id,
        subsectorId: subsector.id,
        tradeName: "Sector Org",
      });

      const carbonInventory = await createCarbonInventory(prisma, {
        organizationId: org.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: 2024,
        createdById: testUserId,
      });
      await createTestCarbonInventorySubmission(
        prisma,
        carbonInventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.APPROVED,
        testUserId
      );

      // No year filter — exercises the `year ? { year } : {}` false branch.
      const unfiltered = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });
      expect(unfiltered.statusCode).toBe(200);
      const unfilteredBody = JSON.parse(
        unfiltered.body
      ) as GetTransparencyDataResponse;
      const row = unfilteredBody.find(
        (r) => r.organizationId === org.id.toString()
      );
      expect(row).toBeDefined();
      expect(row!.organizationName).toBe("Sector Org");
      expect(row!.sectorName).toBe(sector.name);
      expect(row!.subsectorName).toBe(subsector.name);
      expect(row!.year).toBe(2024);
      expect(row!.recognitions.CARBON_INVENTORY_VERIFICATION).toBe(true);
      expect(row!.recognitions.CARBON_INVENTORY_CALCULATION).toBe(false);
      expect(row!.recognitions.REDUCTION_PROJECT_VERIFICATION).toBe(false);

      // Matching year filter — exercises the `year ? { year } : {}` true branch.
      const matchingYear = await app.inject({
        method: "GET",
        url: "/api/transparency?year=2024",
      });
      expect(matchingYear.statusCode).toBe(200);
      const matchingYearBody = JSON.parse(
        matchingYear.body
      ) as GetTransparencyDataResponse;
      expect(
        matchingYearBody.some((r) => r.organizationId === org.id.toString())
      ).toBe(true);

      // Non-matching year filter — the inventory itself is filtered out at the
      // query level, so the organization disappears entirely.
      const otherYear = await app.inject({
        method: "GET",
        url: "/api/transparency?year=2023",
      });
      expect(otherYear.statusCode).toBe(200);
      const otherYearBody = JSON.parse(
        otherYear.body
      ) as GetTransparencyDataResponse;
      expect(
        otherYearBody.some((r) => r.organizationId === org.id.toString())
      ).toBe(false);
    });

    it("should exclude a carbon inventory with a null year", async () => {
      const { org } = await createAccreditedOrganization();
      const carbonInventory = await createCarbonInventory(prisma, {
        organizationId: org.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: null,
        createdById: testUserId,
      });
      await createTestCarbonInventorySubmission(
        prisma,
        carbonInventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.APPROVED,
        testUserId
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetTransparencyDataResponse;
      expect(
        body.some((r) => r.organizationId === org.id.toString())
      ).toBe(false);
    });

    it("should exclude an organization whose carbon inventory has no recognition submissions", async () => {
      const { org } = await createAccreditedOrganization();
      // ACTIVE inventory with a year, but no CI submission and no reduction
      // projects at all — recognitionSet stays empty (row dropped) and the
      // `inventory.submission?...?? []` fallback branch is exercised.
      await createCarbonInventory(prisma, {
        organizationId: org.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: 2024,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetTransparencyDataResponse;
      expect(
        body.some((r) => r.organizationId === org.id.toString())
      ).toBe(false);
    });

    it("should count only reduction-project recognitions whose year matches the inventory's year", async () => {
      const { org } = await createAccreditedOrganization();
      const carbonInventory = await createCarbonInventory(prisma, {
        organizationId: org.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: 2024,
        createdById: testUserId,
      });

      // Matching year + APPROVED verification: counted (recognitionSet
      // becomes non-empty, row included).
      const matchingProject = await createTestReductionProject(
        prisma,
        {
          organizationId: org.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: 1n,
          createdById: testUserId,
        },
        { subcategoryId: null, year: 2024 }
      );
      await createTestReductionProjectSubmission(
        prisma,
        matchingProject.id,
        SubmissionStatus.APPROVED,
        testUserId
      );

      // Mismatched year: its submission must be ignored (the `continue`
      // branch), even though it also holds an APPROVED verification.
      const mismatchedProject = await createTestReductionProject(
        prisma,
        {
          organizationId: org.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: 1n,
          createdById: testUserId,
        },
        { subcategoryId: null, year: 2023 }
      );
      await createTestReductionProjectSubmission(
        prisma,
        mismatchedProject.id,
        SubmissionStatus.APPROVED,
        testUserId
      );

      // Matching year, no submission at all — exercises the
      // `project.submission?...?? []` fallback branch.
      await createTestReductionProject(
        prisma,
        {
          organizationId: org.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: 1n,
          createdById: testUserId,
        },
        { subcategoryId: null, year: 2024 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/transparency",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetTransparencyDataResponse;
      const row = body.find((r) => r.organizationId === org.id.toString());
      expect(row).toBeDefined();
      expect(row!.year).toBe(2024);
      expect(row!.recognitions.REDUCTION_PROJECT_VERIFICATION).toBe(true);
      // No sector/subsector was set for this organization's data.
      expect(row!.sectorName).toBeNull();
      expect(row!.subsectorName).toBeNull();
    });
  });
});
