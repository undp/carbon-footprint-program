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
import type { CreateOrganizationResponse } from "@repo/types";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  MembershipStatus,
  OrganizationRole,
} from "@repo/database";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("POST /api/app/organizations - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Happy path", () => {
    it("should create organization successfully with all required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Organization Legal Name",
          tradeName: "Test Org Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street, Test City",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify response has id
      expect(body.id).toBeTruthy();
      expect(typeof body.id).toBe("string");
    });

    it("should create organization with ACTIVE status in database", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Active Org",
          tradeName: "Active Org",
          taxId: "111111111",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 100,
          address: "123 Active Street",
          representativeFullName: "Jane Smith",
          representativeTaxId: "222222222",
          representativePositionId: "1",
          representativePhone: "+1111111111",
          representativeEmail: "jane@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify organization created with ACTIVE status
      const organization = await prisma.organization.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(organization).toBeDefined();
      expect(organization?.status).toBe(OrganizationStatus.ACTIVE);
    });

    it("should create organization_data with ACTIVE status in database", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Data Test Org",
          tradeName: "Data Test",
          taxId: "333333333",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 25,
          address: "456 Data Street",
          representativeFullName: "Bob Johnson",
          representativeTaxId: "444444444",
          representativePositionId: "1",
          representativePhone: "+2222222222",
          representativeEmail: "bob@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify organization_data created with ACTIVE status
      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });

      expect(organizationData).toBeDefined();
      expect(organizationData?.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(organizationData?.legalName).toBe("Data Test Org");
      expect(organizationData?.tradeName).toBe("Data Test");
      expect(organizationData?.taxId).toBe("333333333");
      expect(organizationData?.employeesCount).toBe(25);
      expect(organizationData?.address).toBe("456 Data Street");
    });

    it("should create ADMIN membership automatically for current user", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Membership Test Org",
          tradeName: "Membership Test",
          taxId: "555555555",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 75,
          address: "789 Membership Avenue",
          representativeFullName: "Alice Cooper",
          representativeTaxId: "666666666",
          representativePositionId: "1",
          representativePhone: "+3333333333",
          representativeEmail: "alice@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify user gets ADMIN (ACCREDITED_MEMBER) membership automatically
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: testUser.id,
          organizationId: BigInt(body.id),
          status: MembershipStatus.ACTIVE,
        },
        include: {
          organization: true,
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.status).toBe(MembershipStatus.ACTIVE);
      expect(membership?.role).toBe(OrganizationRole.ADMIN);
    });

    it("should set createdById to current user ID on organization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Created By Test Org",
          tradeName: "Created By Test",
          taxId: "777777777",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 30,
          address: "321 Creator Street",
          representativeFullName: "Charlie Brown",
          representativeTaxId: "888888888",
          representativePositionId: "1",
          representativePhone: "+4444444444",
          representativeEmail: "charlie@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify createdById is set to current user ID on organization
      const organization = await prisma.organization.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(organization).toBeDefined();
      expect(organization?.createdById).toBe(testUser.id);
    });

    it("should set createdById to current user ID on organization_data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Data Creator Test Org",
          tradeName: "Data Creator Test",
          taxId: "999999999",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 45,
          address: "654 Data Creator Lane",
          representativeFullName: "David Smith",
          representativeTaxId: "101010101",
          representativePositionId: "1",
          representativePhone: "+5555555555",
          representativeEmail: "david@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      // Verify createdById is set to current user ID on organization_data
      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });

      expect(organizationData).toBeDefined();
      expect(organizationData?.createdById).toBe(testUser.id);
    });
  });

  describe("Nullable optional fields", () => {
    it("should store null for every nullable optional field when explicitly sent as null", async () => {
      // Every field below is `.nullable()` in OrganizationMutationDataSchema
      // (not `.optional()`), so the key must be present but `null` is a valid
      // value — this exercises the `|| null` fallback's falsy branch for each
      // of them in `mapOrganizationMutationData` (the "all truthy" branch is
      // already covered by the happy-path tests above).
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Nulls Test Org",
          tradeName: null,
          taxId: null,
          countryOrganizationSizeId: null,
          sectorId: null,
          subsectorId: null,
          employeesCount: null,
          address: null,
          mainActivityId: null,
          representativeFullName: null,
          representativeTaxId: null,
          representativePositionId: null,
          representativePhone: null,
          representativeEmail: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateOrganizationResponse;

      const organizationData = await prisma.organizationData.findFirst({
        where: { organizationId: BigInt(body.id) },
      });

      expect(organizationData).toBeDefined();
      expect(organizationData?.legalName).toBe("Nulls Test Org");
      expect(organizationData?.tradeName).toBeNull();
      expect(organizationData?.taxId).toBeNull();
      expect(organizationData?.address).toBeNull();
      expect(organizationData?.employeesCount).toBeNull();
      expect(organizationData?.representativeFullName).toBeNull();
      expect(organizationData?.representativeTaxId).toBeNull();
      expect(organizationData?.representativePhone).toBeNull();
      expect(organizationData?.representativeEmail).toBeNull();
      expect(organizationData?.countryOrganizationSizeId).toBeNull();
      expect(organizationData?.sectorId).toBeNull();
      expect(organizationData?.subsectorId).toBeNull();
      expect(organizationData?.mainActivityId).toBeNull();
      expect(organizationData?.representativeCountryJobPositionId).toBeNull();
    });
  });

  describe("Validation - Missing required fields", () => {
    it("should return 400 when legalName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("legalName");
    });

    it("should return 400 when tradeName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("tradeName");
    });

    it("should return 400 when taxId is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("taxId");
    });

    it("should return 400 when representativeEmail is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("representativeEmail");
    });

    it("should return 400 when multiple required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          // Missing many required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });
  });

  describe("Validation - Invalid field formats", () => {
    it("should return 400 when representativeEmail is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "invalid-email",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when legalName is empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when employeesCount is not an integer", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50.5,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when countryOrganizationSizeId is invalid format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "invalid-id",
          sectorId: "5",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when sectorId is invalid format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations",
        payload: {
          legalName: "Test Legal Name",
          tradeName: "Test Trade Name",
          taxId: "123456789",
          countryOrganizationSizeId: "1",
          sectorId: "not-a-number",
          subsectorId: "12",
          employeesCount: 50,
          address: "123 Test Street",
          representativeFullName: "John Doe",
          representativeTaxId: "987654321",
          representativePositionId: "1",
          representativePhone: "+1234567890",
          representativeEmail: "john.doe@test.com",
          mainActivityId: "8",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });
  });
});
