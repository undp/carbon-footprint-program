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
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  OrganizationMainActivityStatus,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import type { RestoreOrganizationMainActivityResponse } from "@repo/types";
import { restoreOrganizationMainActivityService } from "@/features/organizationMainActivities/admin/restoreOrganizationMainActivity/service.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminMARes ";

describe("POST /api/admin/organization-main-activities/:id/restore - Integration Tests", () => {
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
    // Main activities carry an FK to sector/subsector — clear them first.
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

  it("restores a DELETED main activity", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Restorable"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as RestoreOrganizationMainActivityResponse;
    expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
  });

  it("returns 409 when an ACTIVE collision exists on (name, sectorId, subsectorId)", async () => {
    const name = uniqueName("Collision");
    await createTestOrganizationMainActivity(prisma, { name });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name,
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the main activity is already ACTIVE", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("AlreadyActive"),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Parent catalog validation", () => {
    it("restores a DELETED activity parented to an ACTIVE sector only", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SectorOnly"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RestoreOrganizationMainActivityResponse;
      expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
      expect(body.countrySectorId).toBe(sector.id.toString());
    });

    it("restores a DELETED activity parented to an ACTIVE subsector with no sector persisted", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SubOnly"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RestoreOrganizationMainActivityResponse;
      expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
      expect(body.countrySubsectorId).toBe(subsector.id.toString());
    });

    it("restores a DELETED activity whose persisted sector/subsector pair is consistent", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Pair"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sector.id,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
    });

    it("returns 400 when the persisted subsector belongs to a different sector than the persisted sector (data integrity guard)", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB"),
      });
      // Bypasses service-level validation by writing directly via the factory —
      // models a legacy/inconsistent row that predates the guard.
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Mismatch"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sectorA.id,
        countrySubsectorId: subB.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 409 when the persisted sector is no longer ACTIVE", async () => {
      const deadSector = await createTestCountrySector(prisma, {
        name: uniqueName("DeadSec"),
        status: CountrySectorStatus.DELETED,
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("OnDeadSector"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: deadSector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("PARENT_NOT_ACTIVE");
    });

    it("returns 409 when the persisted subsector is no longer ACTIVE", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const deadSubsector = await createTestCountrySubsector(
        prisma,
        sector.id,
        {
          name: uniqueName("DeadSub"),
          status: CountrySubsectorStatus.DELETED,
        }
      );
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("OnDeadSubsector"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySubsectorId: deadSubsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("PARENT_NOT_ACTIVE");
    });
  });

  describe("Concurrent restores racing for the same ACTIVE slot", () => {
    it("lets exactly one of two concurrent restores win when both target the same (name, null, null) slot", async () => {
      // Both rows share (name, sector=null, subsector=null). Firing both restores
      // concurrently races them past the transaction's own pre-check "collision"
      // SELECT, so the DB's partial unique index (not the pre-check) is what
      // ultimately rejects the loser — exercising the service's P2002 catch
      // branch instead of the earlier, already-covered 409 pre-check branch.
      const name = uniqueName("Race");
      const maA = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
      });
      const maB = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
      });

      const [responseA, responseB] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/admin/organization-main-activities/${maA.id.toString()}/restore`,
        }),
        app.inject({
          method: "POST",
          url: `/api/admin/organization-main-activities/${maB.id.toString()}/restore`,
        }),
      ]);

      const codes = [responseA.statusCode, responseB.statusCode].sort(
        (a, b) => a - b
      );
      expect(codes).toEqual([200, 409]);

      const [reloadedA, reloadedB] = await Promise.all([
        prisma.organizationMainActivity.findUnique({ where: { id: maA.id } }),
        prisma.organizationMainActivity.findUnique({ where: { id: maB.id } }),
      ]);
      const activeCount = [reloadedA, reloadedB].filter(
        (row) => row!.status === OrganizationMainActivityStatus.ACTIVE
      ).length;
      expect(activeCount).toBe(1);
    });
  });

  describe("Concurrent restore racing a held-open, not-yet-committed restore of the collision row", () => {
    it("returns 409 via the P2002 catch when the collision only becomes visible mid-write", async () => {
      // Unlike the racy Promise.all test above (where both HTTP requests' own
      // pre-check SELECTs typically run before either commits, so the loser is
      // usually caught by the pre-check itself), holding one restore's transaction
      // open right after its own write lets the second restore's pre-check pass
      // (it still only sees the last COMMITTED state) before its final UPDATE blocks
      // on the DB's partial unique index and only then discovers the conflict once
      // the hold commits -- deterministically exercising the P2002 catch block.
      const name = uniqueName("HeldRace");
      const maA = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
      });
      const maB = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
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
          where: { id: maA.id },
          data: { status: OrganizationMainActivityStatus.ACTIVE },
        });
        signalLockTaken();
        await holdGate;
      });

      await lockTaken;

      const restorePromise = app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${maB.id.toString()}/restore`,
      });

      // Give the restore request time to run its own (negative) collision pre-check
      // and reach the blocking UPDATE before we let the held transaction commit.
      await new Promise((resolve) => setTimeout(resolve, 200));
      releaseHold();
      await holdingTx;

      const response = await restorePromise;
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DATABASE_UNIQUE_CONSTRAINT_VIOLATION");

      const [reloadedA, reloadedB] = await Promise.all([
        prisma.organizationMainActivity.findUnique({ where: { id: maA.id } }),
        prisma.organizationMainActivity.findUnique({ where: { id: maB.id } }),
      ]);
      expect(reloadedA!.status).toBe(OrganizationMainActivityStatus.ACTIVE);
      expect(reloadedB!.status).toBe(OrganizationMainActivityStatus.DELETED);
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("NoUser"),
        status: OrganizationMainActivityStatus.DELETED,
      });
      await expect(
        restoreOrganizationMainActivityService(prisma, ma.id.toString(), null)
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });

    // A parent id persisted on the activity but missing entirely from its own table
    // (rather than merely non-ACTIVE) can only happen if referential integrity is
    // bypassed: the real FK is `ON DELETE SET NULL`, so hard-deleting the parent
    // nullifies the child's column instead of leaving it dangling. A minimal stub
    // standing in for the two lookups exercises this defensive branch in isolation,
    // without touching the real DB.
    it("throws ResourceNotFoundError when the persisted sector row is missing entirely (data integrity gap)", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            organizationMainActivity: {
              findUnique: () =>
                Promise.resolve({
                  id: 1n,
                  status: OrganizationMainActivityStatus.DELETED,
                  name: "Stub Activity",
                  countrySectorId: 999n,
                  countrySubsectorId: null,
                }),
            },
            countrySector: {
              findUnique: () => Promise.resolve(null),
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        restoreOrganizationMainActivityService(
          stubPrisma,
          "1",
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    });

    it("throws ResourceNotFoundError when the persisted subsector row is missing entirely (data integrity gap)", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            organizationMainActivity: {
              findUnique: () =>
                Promise.resolve({
                  id: 1n,
                  status: OrganizationMainActivityStatus.DELETED,
                  name: "Stub Activity",
                  countrySectorId: null,
                  countrySubsectorId: 999n,
                }),
            },
            countrySubsector: {
              findUnique: () => Promise.resolve(null),
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        restoreOrganizationMainActivityService(
          stubPrisma,
          "1",
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    });
  });
});
