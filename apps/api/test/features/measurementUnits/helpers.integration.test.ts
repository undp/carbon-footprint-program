import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, MagnitudeStatus } from "@repo/database";
import {
  resolveKgMeasurementUnit,
  getReferenceCountsByMeasurementUnit,
  getMeasurementUnitReferenceCount,
} from "@/features/measurementUnits/helpers.js";
import { KgMeasurementUnitNotFoundError } from "@/features/measurementUnits/errors.js";

/**
 * Direct, non-HTTP tests for `src/features/measurementUnits/helpers.ts`.
 *
 * Some branches in these shared helpers are only reachable when called with
 * inputs that never occur through the create/update/delete/list endpoints
 * (e.g. an empty id list, or a unit that was never given a canonical RMU).
 * Calling the exported helpers directly against the real per-file database is
 * the only way to exercise them.
 */
describe("measurementUnits/helpers.ts - direct unit tests", () => {
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

  describe("resolveKgMeasurementUnit", () => {
    it("throws KgMeasurementUnitNotFoundError when no unit has abbreviation 'kg'", async () => {
      const kg = await prisma.measurementUnit.findUniqueOrThrow({
        where: { abbreviation: "kg" },
      });

      await prisma.measurementUnit.update({
        where: { id: kg.id },
        data: { abbreviation: "test-kg-temporarily-renamed" },
      });

      try {
        await expect(
          prisma.$transaction((tx) => resolveKgMeasurementUnit(tx))
        ).rejects.toThrow(KgMeasurementUnitNotFoundError);
      } finally {
        await prisma.measurementUnit.update({
          where: { id: kg.id },
          data: { abbreviation: "kg" },
        });
      }
    });
  });

  describe("getReferenceCountsByMeasurementUnit", () => {
    it("returns an empty map for an empty id list", async () => {
      const result = await getReferenceCountsByMeasurementUnit(prisma, []);
      expect(result.size).toBe(0);
    });
  });

  describe("getMeasurementUnitReferenceCount", () => {
    it("returns 0 for a unit that has no canonical RMU at all", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const magnitude = await prisma.magnitude.create({
        data: {
          code: `test_orphan_${suffix}`,
          name: `Test Orphan Magnitude ${suffix}`,
          isSystem: false,
          status: MagnitudeStatus.ACTIVE,
        },
      });
      // Created directly (bypassing the create endpoint), so it never got a
      // canonical `kg/<abbr>` RateMeasurementUnit row.
      const orphanUnit = await prisma.measurementUnit.create({
        data: {
          name: `Test Orphan Unit ${suffix}`,
          abbreviation: `test-orphan-${suffix}`,
          magnitudeId: magnitude.id,
          baseFactor: 1,
          isBase: true,
        },
      });

      try {
        const count = await getMeasurementUnitReferenceCount(
          prisma,
          orphanUnit.id
        );
        expect(count).toBe(0);
      } finally {
        await prisma.measurementUnit.delete({ where: { id: orphanUnit.id } });
        await prisma.magnitude.delete({ where: { id: magnitude.id } });
      }
    });
  });
});
