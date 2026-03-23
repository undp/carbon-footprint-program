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
import type { CreateReductionProjectResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { cleanupTestReductionProjects } from "@test/factories/reductionProjectFactory.js";
import { type ApiErrorResponse, VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let organizationId: string;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    organizationId = org.id.toString();
  });

  afterAll(async () => {
    await cleanupTestReductionProjects(prisma);
    await cleanupTestOrganization(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestReductionProjects(prisma);
  });

  describe("Happy path", () => {
    it("should create a reduction project with required fields only", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          organizationId,
          name: "Solar Energy Reduction Project",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;
      expect(body.id).toBeTruthy();
      expect(body.name).toBe("Solar Energy Reduction Project");
      expect(body.status).toBe("DRAFT");
      expect(body.organizationId).toBe(organizationId);
      expect(body.reports).toEqual([]);
    });

    it("should create a reduction project with all optional fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          organizationId,
          name: "Full Reduction Project",
          description: "A comprehensive project",
          implementationDate: "2024-01-15",
          pcg: "AR5",
          usePcgNationalInventory: true,
          selectedGases: ["CO2", "CH4"],
          reportedInOtherInitiative: true,
          otherInitiativeDescription: "CDP Reporting",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;
      expect(body.name).toBe("Full Reduction Project");
      expect(body.description).toBe("A comprehensive project");
      expect(body.pcg).toBe("AR5");
      expect(body.usePcgNationalInventory).toBe(true);
      expect(body.selectedGases).toEqual(["CO2", "CH4"]);
      expect(body.reportedInOtherInitiative).toBe(true);
      expect(body.otherInitiativeDescription).toBe("CDP Reporting");
    });

    it("should set createdById to the current user", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: { organizationId, name: "Creator Test Project" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;

      const project = await prisma.reductionProject.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(project?.createdById).toBe(testUser.id);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: { organizationId },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when organizationId is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: { name: "Test Project" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when organizationId is not a valid number string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: { organizationId: "invalid", name: "Test Project" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 for unknown fields (strict schema)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          organizationId,
          name: "Test",
          unknownField: "value",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
