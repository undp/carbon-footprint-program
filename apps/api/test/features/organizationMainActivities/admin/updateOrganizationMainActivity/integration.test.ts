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
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
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
  Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type { UpdateOrganizationMainActivityResponse } from "@repo/types";
import { updateOrganizationMainActivityService } from "@/features/organizationMainActivities/admin/updateOrganizationMainActivity/service.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminMAUpd ";

describe("PATCH /api/admin/organization-main-activities/:id - Integration Tests", () => {
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
    // Orgs (and their organization_data) hold an FK to the main activity, so they
    // must be cleared before the activity rows below.
    await cleanupTestOrganization(prisma);
    // Carbon inventories carry the activity only inside their organizationData
    // JSON snapshot (no FK), so they never block the deletes below — but they
    // must still be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.organizationMainActivity.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySubsector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("partial update of name", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateOrganizationMainActivityResponse;
    expect(body.name).toBe(newName);
  });

  it("returns 400 with empty body", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when reparenting to a missing sector", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("MA"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { countrySectorId: "9999999999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when reparenting to a DELETED sector", async () => {
    const dead = await createTestCountrySector(prisma, {
      name: uniqueName("DeadSec"),
      status: CountrySectorStatus.DELETED,
    });
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("MA"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { countrySectorId: dead.id.toString() },
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Sector/subsector pairing invariant", () => {
    it("rejects (a) PATCH where (sectorId, subsectorId) explicit pair mismatches", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: {
          countrySectorId: sectorA.id.toString(),
          countrySubsectorId: subB.id.toString(),
        },
      });
      expect(response.statusCode).toBe(400);

      // Confirm not persisted.
      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBeNull();
      expect(after!.countrySubsectorId).toBeNull();
    });

    it("rejects (b) PATCH that changes only countrySectorId while persisted subsector is under a different sector", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA2"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB2"),
      });
      const subA = await createTestCountrySubsector(prisma, sectorA.id, {
        name: uniqueName("SubA"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
        countrySectorId: sectorA.id,
        countrySubsectorId: subA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(400);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("rejects (c) PATCH that changes only countrySubsectorId to a subsector under a different persisted sector", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA3"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB3"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB3"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
        countrySectorId: sectorA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: subB.id.toString() },
      });
      expect(response.statusCode).toBe(400);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySubsectorId).toBeNull();
    });
  });

  describe("Re-parent blocked by dependents", () => {
    it("re-parents to another sector when the activity has no dependents", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Clean"),
        countrySectorId: sectorA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorB.id);
    });

    it("blocks re-parent (409) when an organization profile references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithOrg"),
        countrySectorId: sectorA.id,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { organizationData?: number } };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.organizationData).toBe(1);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("blocks re-parent (409) when an ACTIVE carbon inventory snapshot references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithInv"),
        countrySectorId: sectorA.id,
      });
      // The activity is referenced ONLY inside the inventory's frozen JSON
      // snapshot (stored as a string) — no live organization_data row points at
      // it — so this case is exactly the gap the FK-based count misses.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { carbonInventories?: number } };
      };
      expect(body.code).toBe("EDIT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("does NOT block re-parent when only a DELETED carbon inventory snapshot references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithDeletedInv"),
        countrySectorId: sectorA.id,
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorB.id);
    });

    it("does NOT block when the effective pair equals the current one, even with dependents (no-op)", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SameParent"),
        countrySectorId: sectorA.id,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorA.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });
  });

  describe("Rename blocked by user data", () => {
    it("blocks rename (409) when an organization profile references the activity", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Old"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
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

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.name).toBe(ma.name);
    });

    it("blocks rename (409) when an ACTIVE carbon inventory snapshot references the activity", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Old"),
      });
      // The activity is referenced ONLY inside the inventory's frozen JSON snapshot.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
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

    it("does NOT block rename when only a DELETED carbon inventory snapshot references the activity", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Old"),
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const newName = uniqueName("New");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.name).toBe(newName);
    });
  });

  describe("Editing a soft-deleted row", () => {
    it("returns 404 when renaming a DELETED activity still referenced by user data", async () => {
      // A DELETED row can still carry user-data references, so this is the case
      // that used to surface as a misleading 409 instead of not-found.
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Dead"),
        status: OrganizationMainActivityStatus.DELETED,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { name: uniqueName("New") },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Disconnecting parents explicitly (null)", () => {
    it("disconnects the sector when countrySectorId is explicitly null", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Parented"),
        countrySectorId: sector.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: null },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.countrySectorId).toBeNull();

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBeNull();
    });

    it("disconnects the subsector when countrySubsectorId is explicitly null", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SubParented"),
        countrySectorId: sector.id,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: null },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.countrySubsectorId).toBeNull();
      // The sector, untouched by the patch, stays as-is.
      expect(body.countrySectorId).toBe(sector.id.toString());
    });
  });

  describe("Subsector not found", () => {
    it("returns 404 when reparenting to a missing subsector", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: "9999999999" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when reparenting to a DELETED subsector", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const deadSub = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("DeadSub"),
        status: CountrySubsectorStatus.DELETED,
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: deadSub.id.toString() },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Description field", () => {
    it("updates the description", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithDesc"),
        description: "Old description",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { description: "New description" },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.description).toBe("New description");
    });

    it("clears the description when set to null", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithDesc"),
        description: "Old description",
      });
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { description: null },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.description).toBeNull();
    });
  });

  describe("Duplicate name (DB-level, no pre-check)", () => {
    it("returns 409 when renaming to a name already used by another ACTIVE activity in the same (sector, subsector) scope", async () => {
      const name = uniqueName("Taken");
      await createTestOrganizationMainActivity(prisma, { name });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Mine"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { name },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DATABASE_UNIQUE_CONSTRAINT_VIOLATION");

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.name).not.toBe(name);
    });
  });

  describe("Concurrent update racing a concurrent delete", () => {
    it("returns 404 when the row is soft-deleted by a concurrent request mid-update", async () => {
      // The rename-only PATCH runs several extra queries (reference guard) before
      // its own final, ACTIVE-scoped UPDATE, while DELETE is a single statement —
      // giving the concurrent DELETE a strong chance to commit first, so PATCH's
      // final UPDATE (scoped to status=ACTIVE) matches zero rows and its P2025
      // catch branch fires instead of succeeding.
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("RaceVictim"),
      });

      const [patchResponse, deleteResponse] = await Promise.all([
        app.inject({
          method: "PATCH",
          url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
          payload: { name: uniqueName("RenamedTooLate") },
        }),
        app.inject({
          method: "DELETE",
          url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        }),
      ]);

      expect(deleteResponse.statusCode).toBe(200);
      // Whichever request actually wrote last, the row can only end up in one of
      // two consistent states — confirm the PATCH response matches reality
      // instead of asserting a single fixed status code (this specific race
      // favors DELETE winning, but never both succeeding as if unguarded).
      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.status).toBe(OrganizationMainActivityStatus.DELETED);
      expect([200, 404]).toContain(patchResponse.statusCode);
    });
  });

  describe("Connecting a subsector explicitly (non-null)", () => {
    it("connects a real subsector id when no sector is set on the activity or in the patch", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("NoParents"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: subsector.id.toString() },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.countrySubsectorId).toBe(subsector.id.toString());
      expect(body.countrySectorId).toBeNull();

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySubsectorId).toBe(subsector.id);
    });
  });

  describe("Subsector pairing invariant re-check (persisted subsector, sector-only patch)", () => {
    it("keeps a persisted (sector, subsector) pair valid when the patch touches only the matching sector id", async () => {
      // Re-fetches the persisted subsector (since the patch doesn't touch
      // countrySubsectorId, `validatedSubsector` stays null) and confirms it still
      // matches the patched sector -- the "no mismatch" fall-through at the end of
      // that consistency check, as opposed to the already-covered throw path.
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ConsistentPair"),
        countrySectorId: sector.id,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sector.id.toString() },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationMainActivityResponse;
      expect(body.countrySectorId).toBe(sector.id.toString());
      expect(body.countrySubsectorId).toBe(subsector.id.toString());
    });
  });

  describe("Concurrent delete committing mid-write (deterministic P2025)", () => {
    it("returns 404 when the row is soft-deleted by another transaction between the pre-check and the final write", async () => {
      // Unlike the racy Promise.all test above, this deterministically forces the
      // interleaving: a held-open transaction soft-deletes the row (uncommitted) and
      // blocks; the PATCH's own pre-check still sees the last-committed ACTIVE row
      // (MVCC), passes, and then blocks on its own final UPDATE (row lock contention
      // with the held transaction). Only once we release/commit the hold does the
      // PATCH's UPDATE re-evaluate its WHERE clause and match zero rows, surfacing
      // P2025 -> ResourceNotFoundError from the catch block (not the early pre-check).
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("BlockedRace"),
      });

      let releaseHold: () => void = () => {};
      const holdGate = new Promise<void>((resolve) => {
        releaseHold = resolve;
      });
      let signalLockTaken: () => void = () => {};
      const lockTaken = new Promise<void>((resolve) => {
        signalLockTaken = resolve;
      });

      const holdingTx = prisma.$transaction(async (tx) => {
        await tx.organizationMainActivity.update({
          where: { id: ma.id },
          data: { status: OrganizationMainActivityStatus.DELETED },
        });
        signalLockTaken();
        await holdGate;
      });

      await lockTaken;

      const patchPromise = app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { description: "Will never apply" },
      });

      // Give the PATCH request time to run its pre-check read and reach the final
      // write, where it blocks on the row lock held by `holdingTx`.
      await new Promise((resolve) => setTimeout(resolve, 200));
      releaseHold();
      await holdingTx;

      const response = await patchPromise;
      expect(response.statusCode).toBe(404);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.status).toBe(OrganizationMainActivityStatus.DELETED);
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("NoUser"),
      });
      await expect(
        updateOrganizationMainActivityService(
          prisma,
          ma.id.toString(),
          { description: "x" },
          null
        )
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });

    // The only unique constraint on `organization_main_activity` is the partial
    // (name, countrySectorId, countrySubsectorId) index, so a real P2002 from this
    // table's update() always carries "name" in its duplicated fields, and the only
    // relation `connect` performed here (updater) surfaces as P2025 -- never another
    // code. Both the "not a P2002" and the "P2002 without name" branches in the catch
    // block are therefore defensive-only; a minimal stub standing in for the single
    // write call exercises them in isolation, without touching the real DB.
    it("rethrows a non-P2025/non-P2002 database error unchanged", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            organizationMainActivity: {
              findFirst: () =>
                Promise.resolve({
                  id: 1n,
                  name: "Stub Activity",
                  countrySectorId: null,
                  countrySubsectorId: null,
                }),
              update: () => {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Simulated foreign key violation",
                  { code: "P2003", clientVersion: "test" }
                );
              },
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        updateOrganizationMainActivityService(
          stubPrisma,
          "1",
          { description: "x" },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rethrows a P2002 unchanged when the duplicated fields do not include name", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            organizationMainActivity: {
              findFirst: () =>
                Promise.resolve({
                  id: 1n,
                  name: "Stub Activity",
                  countrySectorId: null,
                  countrySubsectorId: null,
                }),
              update: () => {
                throw new Prisma.PrismaClientKnownRequestError(
                  "Unique constraint failed on the fields: (`other_field`)",
                  {
                    code: "P2002",
                    clientVersion: "test",
                    meta: { target: ["other_field"] },
                  }
                );
              },
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        updateOrganizationMainActivityService(
          stubPrisma,
          "1",
          { description: "x" },
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
