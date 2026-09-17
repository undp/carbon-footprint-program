import { readFileSync } from "node:fs";
import path from "node:path";
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
import {
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  createInventoryFromPattern,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
  SEEDED_CATALOGUE_YEAR,
} from "@test/factories/emissionFactorFactory.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  cleanupTestSubmissions,
  createTestCarbonInventorySubmission,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  CarbonInventoryLineStatus,
  Prisma,
  SubmissionStatus,
  SubmissionType,
  type PrismaClient,
} from "@repo/database";

const MIGRATION_SQL_PATH = path.join(
  import.meta.dirname,
  "../../../../../../packages/database/src/prisma/migrations/20260915160000_add_emission_factor_year/migration.sql"
);

/**
 * The clearing statements of the year migration, read from the migration itself
 * so the assertions below can never drift from the SQL that ships.
 */
function readMigrationClearingStatements(): string[] {
  const sql = readFileSync(MIGRATION_SQL_PATH, "utf8");

  return sql
    .split(";")
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((statement) => statement.startsWith("DELETE FROM"));
}

describe("Migration: add emission_factor.year - Integration Tests", () => {
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
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Schema", () => {
    it("leaves the column required and without a default", async () => {
      const [column] = await prisma.$queryRaw<
        { is_nullable: string; column_default: string | null }[]
      >(Prisma.sql`
        SELECT "is_nullable", "column_default"
        FROM information_schema.columns
        WHERE "table_name" = 'emission_factor' AND "column_name" = 'year'
      `);

      expect(column.is_nullable).toBe("NO");
      // A default would let a factor be created without stating its year,
      // which is what the required column exists to prevent.
      expect(column.column_default).toBeNull();
    });

    it("keys the partial unique index on the year as well", async () => {
      const [index] = await prisma.$queryRaw<{ indexdef: string }[]>(
        Prisma.sql`
          SELECT "indexdef" FROM pg_indexes
          WHERE "tablename" = 'emission_factor'
            AND "indexname" = 'emission_factor_unique_subcategory_dims_source'
        `
      );

      expect(index.indexdef).toContain("year");
      expect(index.indexdef).toContain("subcategory_id");
      expect(index.indexdef).toContain("source");
      expect(index.indexdef).toContain("DELETED");
    });

    it("dates the whole seeded catalogue without rewriting a single source", async () => {
      const grouped = await prisma.emissionFactor.groupBy({
        by: ["year"],
        _count: { _all: true },
      });

      expect(grouped).toHaveLength(1);
      expect(grouped[0].year).toBe(SEEDED_CATALOGUE_YEAR);

      // The editions stay in the name: the year answers "valid for which
      // footprint year", `source` answers "what is it called".
      const sources = await prisma.emissionFactor.findMany({
        distinct: ["source"],
        select: { source: true },
        orderBy: { source: "asc" },
      });
      expect(sources.map(({ source }) => source)).toEqual([
        "DEFRA 2025",
        "EcoAct 2020",
        "IPCC",
        "Kool, A.",
      ]);
    });
  });

  describe("Data transition", () => {
    /**
     * One footprint with, on a single subcategory:
     *  - a catalogue-backed line (snapshot with a factor id) and its result;
     *  - a manual-factor line (custom source, no factor id);
     *  - a damaged line: no factor id, but the real catalogue source — a line
     *    edited before the factor identity was preserved;
     *  - a parked (`OUTDATED`) catalogue-backed line;
     *  - a superseded input version of the catalogue-backed line.
     */
    async function seedFootprint(options: {
      year: number | null;
      isEditable?: boolean;
    }) {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        {
          methodologyVersionId,
          year: options.year,
          isEditable: options.isEditable ?? true,
        }
      );
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      const factor = await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        rateUnitId,
        { source: "DEFRA 2025", year: 2025, value: "2.5" }
      );

      const seedLine = async (snapshot: {
        status?: CarbonInventoryLineStatus;
        emissionFactorId: bigint | null;
        appliedFactorSource: string;
        isActive?: boolean;
      }) => {
        const line = await createCarbonInventoryLine(
          prisma,
          carbonInventory.id,
          subcategoryIds[0],
          { status: snapshot.status ?? CarbonInventoryLineStatus.ACTIVE }
        );
        const input = await createCarbonInventoryLineInput(prisma, line.id, {
          quantity: new Prisma.Decimal(10),
          isActive: snapshot.isActive ?? true,
        });
        await createCarbonInventoryLineFactor(prisma, input.id, {
          appliedFactorValue: new Prisma.Decimal(2.5),
          appliedFactorRateUnitId: rateUnitId,
          emissionFactorId: snapshot.emissionFactorId,
          appliedFactorSource: snapshot.appliedFactorSource,
        });
        await createCarbonInventoryLineResult(prisma, input.id, 25);
        return { line, input };
      };

      const catalogue = await seedLine({
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      const manual = await seedLine({
        emissionFactorId: null,
        appliedFactorSource: "Otro",
      });
      const damaged = await seedLine({
        emissionFactorId: null,
        appliedFactorSource: "DEFRA 2025",
      });
      const parked = await seedLine({
        status: CarbonInventoryLineStatus.OUTDATED,
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });

      // A superseded version of the catalogue-backed line: same line, an
      // inactive input holding its own snapshot and result.
      const supersededInput = await createCarbonInventoryLineInput(
        prisma,
        catalogue.line.id,
        { quantity: new Prisma.Decimal(9), isActive: false }
      );
      await createCarbonInventoryLineFactor(prisma, supersededInput.id, {
        appliedFactorValue: new Prisma.Decimal(2.5),
        appliedFactorRateUnitId: rateUnitId,
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      await createCarbonInventoryLineResult(prisma, supersededInput.id, 22);

      return {
        carbonInventory,
        catalogue,
        manual,
        damaged,
        parked,
        supersededInput,
      };
    }

    async function runClearing() {
      const statements = readMigrationClearingStatements();
      // Two: the results first, then the snapshots they were computed from.
      expect(statements).toHaveLength(2);
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
    }

    const hasSnapshot = async (lineInputId: bigint) =>
      (await prisma.carbonInventoryLineFactor.findUnique({
        where: { lineInputId },
      })) !== null;

    const hasResult = async (lineInputId: bigint) =>
      (await prisma.carbonInventoryLineResult.findUnique({
        where: { lineInputId },
      })) !== null;

    it("clears a footprint of another year whatever its state", async () => {
      const { id: userId } = await getTestLoggedUser(prisma);

      const editable = await seedFootprint({ year: 2024 });
      const submitted = await seedFootprint({ year: 2024, isEditable: false });
      const verified = await seedFootprint({ year: 2024, isEditable: false });

      await createTestCarbonInventorySubmission(
        prisma,
        submitted.carbonInventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        userId
      );
      await createTestCarbonInventorySubmission(
        prisma,
        verified.carbonInventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.APPROVED,
        userId
      );

      await runClearing();

      for (const footprint of [editable, submitted, verified]) {
        expect(await hasSnapshot(footprint.catalogue.input.id)).toBe(false);
        expect(await hasResult(footprint.catalogue.input.id)).toBe(false);

        // The line itself survives with everything the user entered, and no
        // replacement factor is chosen.
        const line = await prisma.carbonInventoryLine.findUniqueOrThrow({
          where: { id: footprint.catalogue.line.id },
          select: { status: true, subcategoryId: true },
        });
        expect(line.status).toBe(CarbonInventoryLineStatus.ACTIVE);
        const input = await prisma.carbonInventoryLineInput.findUniqueOrThrow({
          where: { id: footprint.catalogue.input.id },
          select: { quantity: true },
        });
        expect(input.quantity?.toString()).toBe("10");

        // Its year is not touched either — the footprint still reports 2024.
        const stored = await prisma.carbonInventory.findUniqueOrThrow({
          where: { id: footprint.carbonInventory.id },
          select: { year: true },
        });
        expect(stored.year).toBe(2024);
      }
    });

    it("leaves a footprint of the catalogue's own year untouched", async () => {
      const footprint = await seedFootprint({ year: 2025 });

      await runClearing();

      expect(await hasSnapshot(footprint.catalogue.input.id)).toBe(true);
      expect(await hasResult(footprint.catalogue.input.id)).toBe(true);
      expect(await hasSnapshot(footprint.parked.input.id)).toBe(true);
      expect(await hasSnapshot(footprint.damaged.input.id)).toBe(true);
    });

    it("clears a parked line and a damaged snapshot, and spares the manual one", async () => {
      const footprint = await seedFootprint({ year: 2024 });

      await runClearing();

      // Parked: it can be reactivated without passing through line sync.
      expect(await hasSnapshot(footprint.parked.input.id)).toBe(false);
      expect(await hasResult(footprint.parked.input.id)).toBe(false);

      // Damaged: no factor id, but a real catalogue source — a catalogue line,
      // not a manual one, and no attempt is made to re-link it.
      expect(await hasSnapshot(footprint.damaged.input.id)).toBe(false);
      expect(await hasResult(footprint.damaged.input.id)).toBe(false);

      // Manual: the value and the source were typed by the user and no
      // catalogue can restore them.
      expect(await hasSnapshot(footprint.manual.input.id)).toBe(true);
      expect(await hasResult(footprint.manual.input.id)).toBe(true);
      const manualSnapshot =
        await prisma.carbonInventoryLineFactor.findUniqueOrThrow({
          where: { lineInputId: footprint.manual.input.id },
        });
      expect(manualSnapshot.appliedFactorSource).toBe("Otro");
    });

    it("keeps the superseded input versions as audit trail", async () => {
      const footprint = await seedFootprint({ year: 2024 });

      await runClearing();

      expect(await hasSnapshot(footprint.catalogue.input.id)).toBe(false);
      expect(await hasSnapshot(footprint.supersededInput.id)).toBe(true);
      expect(await hasResult(footprint.supersededInput.id)).toBe(true);
    });

    it("clears a footprint with no year at all", async () => {
      const footprint = await seedFootprint({ year: null });

      await runClearing();

      // It is offered no factors, so a snapshot there is as unofferable as one
      // from another year.
      expect(await hasSnapshot(footprint.catalogue.input.id)).toBe(false);
      expect(await hasSnapshot(footprint.manual.input.id)).toBe(true);
    });
  });
});
