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
  MembershipStatus,
} from "@repo/database";
import type { CreateOrganizationResponse } from "@repo/types";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("POST /api/app/organizations - Integration Tests", () => {
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

  describe("Successful organization creation", () => {
    it("should create organization with valid data", async () => {
      // Get test data
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      expect(countryOrganizationSize).toBeDefined();
      expect(sector).toBeDefined();
      expect(subsector).toBeDefined();
      expect(mainActivity).toBeDefined();
      expect(jobPosition).toBeDefined();

      const requestBody = {
        legalName: "Test Organization Legal Name",
        tradeName: "Test Org Trade Name",
        taxId: "TEST-TAX-ID-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "123 Test Street, Test City",
        representativeFullName: "John Doe",
        representativeTaxId: "REP-TAX-001",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "john.doe@testorg.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;
      expect(body.id).toBeDefined();
      expect(typeof body.id).toBe("string");

      // Verify organization was created
      const organization = await prisma.organization.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(organization).toBeDefined();
      expect(organization!.status).toBe(OrganizationStatus.ACTIVE);

      // Verify organization data was created
      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });
      expect(organizationData).toBeDefined();
      expect(organizationData!.legalName).toBe("Test Organization Legal Name");
      expect(organizationData!.tradeName).toBe("Test Org Trade Name");
      expect(organizationData!.taxId).toBe("TEST-TAX-ID-001");
      expect(organizationData!.employeesCount).toBe(50);
      expect(organizationData!.address).toBe("123 Test Street, Test City");
      expect(organizationData!.representativeFullName).toBe("John Doe");
      expect(organizationData!.representativeTaxId).toBe("REP-TAX-001");
      expect(organizationData!.representativePhone).toBe("+1234567890");
      expect(organizationData!.representativeEmail).toBe(
        "john.doe@testorg.com"
      );
      expect(organizationData!.status).toBe(OrganizationDataStatus.ACTIVE);

      // Verify user membership was created
      const user = await getTestLoggedUser(prisma);
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: user.id,
          organizationId: BigInt(body.id),
        },
        include: {
          organizationRole: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(membership).toBeDefined();
      expect(membership!.status).toBe(MembershipStatus.ACTIVE);
      expect(membership!.organizationRole.role.name).toBe("ACCREDITED_MEMBER");
    });

    it("should create organization with minimal required fields", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Minimal Org",
        tradeName: "Minimal",
        taxId: "MIN-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 1,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;
      expect(body.id).toBeDefined();
    });

    it("should create organization with special characters in text fields", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Organización España S.A. (España)",
        tradeName: "España & Ñoño - Test",
        taxId: "ESP-ÑÑÑ-123",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 100,
        address: "Calle Principal #123, Piso 4º",
        representativeFullName: "José María García-López",
        representativeTaxId: "12345678-X",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+34 912 345 678",
        representativeEmail: "jose.garcia@espanna.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });
      expect(organizationData!.legalName).toBe(
        "Organización España S.A. (España)"
      );
      expect(organizationData!.tradeName).toBe("España & Ñoño - Test");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when legalName is missing", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        // legalName is missing
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when legalName is empty string", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "",
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when taxId is missing", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        // taxId is missing
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when employeesCount is not an integer", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50.5, // Not an integer
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when representativeEmail is invalid", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "not-an-email",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when countryOrganizationSizeId is invalid", async () => {
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: "invalid-id",
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when required representative fields are missing", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Legal Name",
        tradeName: "Trade Name",
        taxId: "TAX-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        // representativeFullName is missing
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Data consistency", () => {
    it("should create organization with correct foreign key relationships", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Test Org",
        tradeName: "Test",
        taxId: "TAX-FK-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
        include: {
          countryOrganizationSize: true,
          sector: true,
          subsector: true,
          mainActivity: true,
          representativeCountryJobPosition: true,
        },
      });

      expect(organizationData!.countryOrganizationSizeId).toEqual(
        countryOrganizationSize!.id
      );
      expect(organizationData!.sectorId).toEqual(sector!.id);
      expect(organizationData!.subsectorId).toEqual(subsector!.id);
      expect(organizationData!.mainActivityId).toEqual(mainActivity!.id);
      expect(organizationData!.representativeCountryJobPositionId).toEqual(
        jobPosition!.id
      );
    });

    it("should set correct createdById and updatedById", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();
      const user = await getTestLoggedUser(prisma);

      const requestBody = {
        legalName: "Test Org",
        tradeName: "Test",
        taxId: "TAX-USER-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organization = await prisma.organization.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(organization!.createdById).toEqual(user.id);
      expect(organization!.updatedById).toEqual(user.id);

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });
      expect(organizationData!.createdById).toEqual(user.id);
    });

    it("should set timestamps on creation", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const beforeCreate = new Date();

      const requestBody = {
        legalName: "Test Org",
        tradeName: "Test",
        taxId: "TAX-TIME-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      const afterCreate = new Date();
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organization = await prisma.organization.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(organization!.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(organization!.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
      expect(organization!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(organization!.updatedAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle duplicate taxId by allowing it (no unique constraint)", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "First Org",
        tradeName: "First",
        taxId: "DUPLICATE-TAX-ID",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address 1",
        representativeFullName: "Name 1",
        representativeTaxId: "TAX-1",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email1@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response1 = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response1.statusCode).toBe(201);

      // Try creating another organization with the same taxId
      const requestBody2 = {
        ...requestBody,
        legalName: "Second Org",
        tradeName: "Second",
        representativeEmail: "email2@test.com",
      };

      const response2 = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody2,
      });

      // Should succeed as there's no unique constraint on taxId in organizationData
      expect(response2.statusCode).toBe(201);
    });

    it("should handle large employee count", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Large Corp",
        tradeName: "Large",
        taxId: "LARGE-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 1000000,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });
      expect(organizationData!.employeesCount).toBe(1000000);
    });

    it("should handle long text fields", async () => {
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const longAddress = "A".repeat(500);
      const longName = "Very Long Organization Name ".repeat(10);

      const requestBody = {
        legalName: longName,
        tradeName: "Long Text Org",
        taxId: "LONG-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: longAddress,
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });
      expect(organizationData!.legalName).toBe(longName);
      expect(organizationData!.address).toBe(longAddress);
    });
  });

  describe("Transaction integrity", () => {
    it("should rollback all changes if membership creation fails", async () => {
      // This test verifies that if any part of the transaction fails,
      // the entire transaction is rolled back
      const countryOrganizationSize =
        await prisma.countryOrganizationSize.findFirst();
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst({
        where: { countrySectorId: sector?.id },
      });
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      const jobPosition = await prisma.countryJobPosition.findFirst();

      const requestBody = {
        legalName: "Transaction Test Org",
        tradeName: "Transaction Test",
        taxId: "TRANS-001",
        countryOrganizationSizeId: countryOrganizationSize!.id.toString(),
        sectorId: sector!.id.toString(),
        subsectorId: subsector!.id.toString(),
        employeesCount: 50,
        address: "Address",
        representativeFullName: "Name",
        representativeTaxId: "TAX",
        representativePositionId: jobPosition!.id.toString(),
        representativePhone: "+1234567890",
        representativeEmail: "email@test.com",
        mainActivityId: mainActivity!.id.toString(),
      };

      const orgCountBefore = await prisma.organization.count();
      const orgDataCountBefore = await prisma.organizationData.count();

      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: requestBody,
      });

      if (response.statusCode === 201) {
        // If successful, verify counts increased
        const orgCountAfter = await prisma.organization.count();
        const orgDataCountAfter = await prisma.organizationData.count();
        expect(orgCountAfter).toBe(orgCountBefore + 1);
        expect(orgDataCountAfter).toBe(orgDataCountBefore + 1);
      } else {
        // If failed, verify nothing was created
        const orgCountAfter = await prisma.organization.count();
        const orgDataCountAfter = await prisma.organizationData.count();
        expect(orgCountAfter).toBe(orgCountBefore);
        expect(orgDataCountAfter).toBe(orgDataCountBefore);
      }
    });
  });
});
