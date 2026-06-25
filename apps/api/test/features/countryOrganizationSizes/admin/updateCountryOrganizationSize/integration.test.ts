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
import { createTestCountryOrganizationSize } from "@test/factories/countryOrganizationSizeFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import type { UpdateCountryOrganizationSizeResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSizeUpd ";

describe("PATCH /api/admin/country-organization-sizes/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Orgs (and their organization_data) hold an FK to the size via
    // countryOrganizationSizeId, so they must be cleared before the size rows below.
    await cleanupTestOrganization(prisma);
    // Carbon inventories carry the size only inside their organizationData JSON
    // snapshot (no FK), so they never block the delete below — but they must still
    // be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countryOrganizationSize.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("partial update of name", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateCountryOrganizationSizeResponse;
    expect(body.name).toBe(newName);
  });

  it("description tri-state: empty string clears the value", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Cleared"),
      description: "to clear",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { description: "" },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateCountryOrganizationSizeResponse;
    expect(body.description).toBeNull();
  });

  it("returns 400 with empty body", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/country-organization-sizes/9999999999",
      payload: { name: uniqueName("X") },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 409 when renaming into an existing ACTIVE name", async () => {
    const taken = uniqueName("Taken");
    await createTestCountryOrganizationSize(prisma, { name: taken });
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Mine"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { name: taken },
    });
    expect(response.statusCode).toBe(409);
  });

  it("does not block renaming into a name only used by a DELETED size", async () => {
    const ghost = uniqueName("Ghost");
    await createTestCountryOrganizationSize(prisma, {
      name: ghost,
      status: CountryOrganizationSizeStatus.DELETED,
    });
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Live"),
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { name: ghost },
    });
    expect(response.statusCode).toBe(200);
  });

  describe("Rename blocked by user data", () => {
    it("blocks rename (409) when an organization profile references the size", async () => {
      const size = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("Old"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          countryOrganizationSizeId: size.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: {
          attemptedChange?: string;
          referencedBy?: { organizationData?: number };
        };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.attemptedChange).toBe("name");
      expect(body.details?.referencedBy?.organizationData).toBe(1);

      const reloaded = await prisma.countryOrganizationSize.findUnique({
        where: { id: size.id },
      });
      expect(reloaded!.name).toBe(size.name);
    });

    it("blocks rename (409) when an ACTIVE carbon inventory snapshot references the size", async () => {
      const size = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("Old"),
      });
      // The size is referenced ONLY inside the inventory's frozen JSON snapshot —
      // no live organization_data row points at it — so this is exactly the gap the
      // FK-based count misses.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          sizeId: size.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: {
          attemptedChange?: string;
          referencedBy?: { carbonInventories?: number };
        };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.attemptedChange).toBe("name");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);
    });

    it("does NOT block rename when only a DELETED carbon inventory snapshot references the size", async () => {
      const size = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("Old"),
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          sizeId: size.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const newName = uniqueName("New");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCountryOrganizationSizeResponse;
      expect(body.name).toBe(newName);
    });

    it("allows a description-only edit even when the size is in use", async () => {
      const size = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("Named"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          countryOrganizationSizeId: size.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
        payload: { description: "Nueva descripción" },
      });
      expect(response.statusCode).toBe(200);
    });
  });
});
