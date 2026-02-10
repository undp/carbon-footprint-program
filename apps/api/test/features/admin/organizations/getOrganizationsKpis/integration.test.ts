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
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import type { GetOrganizationsKpisResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { cleanupTestOrganizationData } from "../../../../factories/organizationDataFactory.js";

describe("GET /api/admin/organizations/kpis - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testCountryId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    const country = await prisma.country.findFirst();
    if (!country) throw new Error("No country found in database for testing");
    testCountryId = country.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganizationData(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return response with all KPI fields", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("blockedTotal");
      expect(body).toHaveProperty("notAccreditedTotal");
      expect(body).toHaveProperty("accreditedTotal");
      expect(typeof body.total).toBe("number");
      expect(typeof body.blockedTotal).toBe("number");
      expect(typeof body.notAccreditedTotal).toBe("number");
      expect(typeof body.accreditedTotal).toBe("number");
    });

    it("should return correct counts for each status", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "BLOCKED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.notAccreditedTotal).toBe(2);
      expect(body.accreditedTotal).toBe(3);
      expect(body.blockedTotal).toBe(1);
      expect(body.total).toBe(6);
    });

    it("should return total equal to the sum of all status counts", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "BLOCKED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.total).toBe(
        body.blockedTotal + body.notAccreditedTotal + body.accreditedTotal
      );
    });
  });

  describe("Status count accuracy", () => {
    it("should count only NOT_ACCREDITED organizations", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.notAccreditedTotal).toBe(2);
    });

    it("should count only ACCREDITED organizations", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "BLOCKED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.accreditedTotal).toBe(2);
    });

    it("should count only BLOCKED organizations", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "BLOCKED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "BLOCKED",
      });
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.blockedTotal).toBe(2);
    });
  });

  describe("Edge cases", () => {
    it("should return zero for statuses with no organizations", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "NOT_ACCREDITED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.notAccreditedTotal).toBe(1);
      expect(body.accreditedTotal).toBe(0);
      expect(body.blockedTotal).toBe(0);
    });

    it("should return all zeros when no organizations exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.total).toBe(0);
      expect(body.blockedTotal).toBe(0);
      expect(body.notAccreditedTotal).toBe(0);
      expect(body.accreditedTotal).toBe(0);
    });

    it("should count organizations without organization_data", async () => {
      await createTestOrganization(prisma, {
        countryId: testCountryId,
        status: "ACCREDITED",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationsKpisResponse;

      expect(body.accreditedTotal).toBe(1);
      expect(body.total).toBe(1);
    });
  });
});
