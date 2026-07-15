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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { UpdateMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { updateMethodologyService } from "@/features/methodologies/updateMethodology/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

describe("PATCH /api/methodologies/:id - Integration Tests", () => {
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

  afterEach(async () => {
    await restoreMethodologies(prisma);
  });

  describe("Successful update", () => {
    it("should update the name of a methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Original Name",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology.id}`,
        payload: {
          name: "Test - Updated Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMethodologyResponse;
      expect(body.name).toBe("Test - Updated Name");
    });

    it("should update the description of a methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Update Description",
        description: "Original description",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology.id}`,
        payload: {
          description: "Updated description",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMethodologyResponse;
      expect(body.description).toBe("Updated description");
    });

    it("should update multiple fields at once", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Multi Update",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology.id}`,
        payload: {
          name: "Test - Multi Updated",
          regulation: "New Regulation",
          version: "3.0",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMethodologyResponse;
      expect(body.name).toBe("Test - Multi Updated");
      expect(body.regulation).toBe("New Regulation");
      expect(body.version).toBe("3.0");
    });

    it("should only update specified fields and leave others unchanged", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Partial Update",
        description: "Original description",
        regulation: "Original Regulation",
        version: "1.0",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology.id}`,
        payload: {
          name: "Test - Partial Updated",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMethodologyResponse;
      expect(body.name).toBe("Test - Partial Updated");
      expect(body.description).toBe("Original description");
      expect(body.regulation).toBe("Original Regulation");
      expect(body.version).toBe("1.0");
    });
  });

  describe("Publishing logic", () => {
    it("should unpublish other methodologies when setting status to PUBLISHED", async () => {
      // Create two unpublished methodologies
      const methodology1 = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Publish First",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const methodology2 = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Publish Second",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      // Publish the first one
      const firstPublishResponse = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology1.id}`,
        payload: { status: "PUBLISHED" },
      });
      expect(firstPublishResponse.statusCode).toBe(200);

      // Publish the second one
      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology2.id}`,
        payload: { status: "PUBLISHED" },
      });

      expect(response.statusCode).toBe(200);

      // Verify the first methodology is now unpublished
      const dbMethodology1 = await prisma.methodologyVersion.findUnique({
        where: { id: methodology1.id },
      });
      expect(dbMethodology1!.status).toBe(MethodologyVersionStatus.UNPUBLISHED);

      // Verify the second methodology is published
      const dbMethodology2 = await prisma.methodologyVersion.findUnique({
        where: { id: methodology2.id },
      });
      expect(dbMethodology2!.status).toBe(MethodologyVersionStatus.PUBLISHED);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/methodologies/999999",
        payload: { name: "Test - Nonexistent" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when updating a deleted methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Deleted For Update",
        status: MethodologyVersionStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology.id}`,
        payload: { name: "Test - Should Fail" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_IS_DELETED");
    });

    it("should return 409 when renaming to an existing name", async () => {
      const countryId = (await prisma.country.findFirst())!.id;

      // Create directly with Prisma to have exact control over the name
      await prisma.methodologyVersion.create({
        data: {
          countryId,
          name: "Test - Exact Duplicate Target",
          description: "Target",
          regulation: "Regulation",
          version: "1.0",
          status: MethodologyVersionStatus.UNPUBLISHED,
          updatedAt: null,
        },
      });

      const methodology2 = await prisma.methodologyVersion.create({
        data: {
          countryId,
          name: "Test - To Be Renamed",
          description: "Source",
          regulation: "Regulation",
          version: "1.0",
          status: MethodologyVersionStatus.UNPUBLISHED,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/methodologies/${methodology2.id}`,
        payload: { name: "Test - Exact Duplicate Target" },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NAME_VERSION_ALREADY_EXISTS");
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should set updatedById to null when updating without an authenticated user", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - No User Update",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await updateMethodologyService(
        prisma,
        methodology.id.toString(),
        { name: "Test - No User Update Renamed" },
        null
      );
      expect(response.name).toBe("Test - No User Update Renamed");

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: methodology.id },
      });
      expect(dbRecord!.updatedById).toBeNull();
    });

    it("should rethrow a non-duplicate database error unchanged (foreign key violation)", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - FK Violation Update",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const testUser = await getTestLoggedUser(prisma);
      const bogusUser = {
        ...mapUserToResponse(testUser),
        id: "999999999999",
      };

      await expect(
        updateMethodologyService(
          prisma,
          methodology.id.toString(),
          { name: "Test - FK Violation Update Renamed" },
          bogusUser
        )
      ).rejects.toThrow();
    });

    it("should perform a no-op update (skip setting updatedById) when called directly with no fields provided", async () => {
      // `UpdateMethodologyRequestSchema` has a zod `.refine` requiring at
      // least one defined field, so an empty payload is rejected with 400 at
      // the HTTP layer before it ever reaches the service. Calling the
      // service directly with `{}` is the only way to exercise the
      // `Object.keys(updateData).length > 0` false branch.
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Empty Update Direct Call",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const testUser = await getTestLoggedUser(prisma);

      const response = await updateMethodologyService(
        prisma,
        methodology.id.toString(),
        {},
        mapUserToResponse(testUser)
      );

      expect(response.name).toBe(methodology.name);

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: methodology.id },
      });
      expect(dbRecord!.updatedById).toBeNull();
    });
  });
});
