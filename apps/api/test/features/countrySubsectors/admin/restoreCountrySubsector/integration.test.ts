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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySubsectorStatus,
  CountrySectorStatus,
} from "@repo/database";
import type { RestoreCountrySubsectorResponse } from "@repo/types";
import { restoreCountrySubsectorService } from "@/features/countrySubsectors/admin/restoreCountrySubsector/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminSubRes ";

describe("POST /api/admin/country-subsectors/:id/restore - Integration Tests", () => {
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

  it("restores a DELETED subsector when no collision exists", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Restorable"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${sub.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as RestoreCountrySubsectorResponse;
    expect(body.status).toBe(CountrySubsectorStatus.ACTIVE);
  });

  it("returns 409 when ACTIVE collision exists in the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const name = uniqueName("Collision");
    await createTestCountrySubsector(prisma, parent.id, { name });
    const deleted = await createTestCountrySubsector(prisma, parent.id, {
      name,
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the subsector is already ACTIVE", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("AlreadyActive"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${sub.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when the subsector id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 409 when the parent sector has been soft-deleted", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("DeletedParent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("OrphanRestore"),
      status: CountrySubsectorStatus.DELETED,
    });
    await prisma.countrySector.update({
      where: { id: parent.id },
      data: { status: CountrySectorStatus.DELETED },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${sub.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("PARENT_NOT_ACTIVE");
  });

  it("returns 409 for exactly one of two concurrent restores that collide on the same active name", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("RaceParent"),
    });
    const name = uniqueName("RaceName");
    const first = await createTestCountrySubsector(prisma, parent.id, {
      name,
      status: CountrySubsectorStatus.DELETED,
    });
    const second = await createTestCountrySubsector(prisma, parent.id, {
      name,
      status: CountrySubsectorStatus.DELETED,
    });

    const [firstResponse, secondResponse] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/admin/country-subsectors/${first.id.toString()}/restore`,
      }),
      app.inject({
        method: "POST",
        url: `/api/admin/country-subsectors/${second.id.toString()}/restore`,
      }),
    ]);

    const statusCodes = [
      firstResponse.statusCode,
      secondResponse.statusCode,
    ].sort();
    expect(statusCodes).toEqual([200, 409]);
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("NoUserParent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("NoUser"),
        status: CountrySubsectorStatus.DELETED,
      });
      await expect(
        restoreCountrySubsectorService(prisma, sub.id.toString(), null)
      ).rejects.toThrow();
    });

    // A country_subsector row can never reference a country_sector id that
    // doesn't exist -- the FK constraint enforces this at insert time -- so
    // this guard is defensive-only. A minimal stub standing in for the
    // transaction's reads exercises it in isolation, without touching the
    // real DB.
    it("should throw ResourceNotFoundError (CountrySector) when the parent sector row is missing", async () => {
      const stubPrisma = {
        $transaction: (fn: (tx: unknown) => unknown) =>
          fn({
            countrySubsector: {
              findUnique: () =>
                Promise.resolve({
                  id: 1n,
                  status: CountrySubsectorStatus.DELETED,
                  countrySectorId: 999999n,
                  name: "Ghost Subsector",
                }),
            },
            countrySector: {
              findUnique: () => Promise.resolve(null),
            },
          }),
      } as unknown as PrismaClient;
      const testUser = await getTestLoggedUser(prisma);

      await expect(
        restoreCountrySubsectorService(
          stubPrisma,
          "1",
          mapUserToResponse(testUser)
        )
      ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    });
  });
});
