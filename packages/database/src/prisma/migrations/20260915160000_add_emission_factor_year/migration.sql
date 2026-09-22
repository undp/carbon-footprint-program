-- Scopes every emission factor to the footprint year it is valid for, and leaves
-- the existing footprints in a state the new rule describes.
--
-- Backfill value: 2025. The shipped catalogue is the one that serves 2025
-- footprints — 195 of its 284 rows already carry "DEFRA 2025" in `source`, the
-- rest keep their edition in the name (IPCC, EcoAct 2020, Kool, A.) while
-- stating 2025 as their validity. No `source` string is rewritten: the name and
-- the validity answer different questions. A factor an administrator loaded by
-- hand for another period is swept into 2025 along with the rest. Correcting it
-- afterwards is editing one row in the maintainer, which is only possible at all
-- because the year is now explicit.
--
-- No column default is added. A default would let a factor be created without
-- stating its year, which is exactly what the required column exists to prevent.

-- AlterTable: add the column nullable so the existing rows survive the ALTER
ALTER TABLE "emission_factor" ADD COLUMN "year" INTEGER;

-- Backfill: the shipped catalogue serves 2025
UPDATE "emission_factor" SET "year" = 2025;

-- AlterTable: no row may be undated from here on
ALTER TABLE "emission_factor" ALTER COLUMN "year" SET NOT NULL;

-- DropIndex / CreateIndex: the uniqueness key gains the year, so a catalogue
-- loaded for a new year can restate the same subcategory and dimensions.
-- `year` is NOT NULL, so Postgres' default NULLS DISTINCT behaviour is not in
-- play for it and no COALESCE wrapper is needed. (`dimension_value_1_id` and
-- `dimension_value_2_id` stay nullable — a pre-existing gap, out of scope.)
--
-- TODO: this WHERE must become `WHERE "status" = 'ACTIVE'` if a draft factor
-- state is ever introduced, or two drafts of the same key would collide before
-- either is published. See the TODO on `EmissionFactorStatus` in schema.prisma.
DROP INDEX "emission_factor_unique_subcategory_dims_source";

CREATE UNIQUE INDEX "emission_factor_unique_subcategory_dims_source"
  ON "emission_factor" ("subcategory_id", "dimension_value_1_id", "dimension_value_2_id", "source", "year")
  WHERE "status" <> 'DELETED';

-- Data transition: dating the catalogue does not retroactively fix the
-- footprints that already used it. A footprint of any year other than 2025 keeps
-- a total computed from factors it will no longer be offered, and its capture
-- screen would paint the factor cell blank — the frozen source is no longer among
-- the options the selector builds for its year. Every such footprint therefore
-- has the factor snapshots of its catalogue-backed lines removed, and the
-- results computed from them, so those lines come back asking for a factor while
-- keeping their subcategory, dimension selections, measurement unit and
-- quantity. DIRECT inputs are the one exception, explained below.
--
-- It spares nothing: editable, submitted and verified footprints alike. Sparing
-- the submitted ones is what would leave a source of mismatched data behind —
-- a submitted footprint can be duplicated, or returned with observations and
-- become editable again, in both cases arriving at an editable footprint holding
-- factors the selector will not offer. Clearing everything once means neither
-- route needs any code. The "editable" state is not reproduced in SQL on
-- purpose: it is derived from the footprint's submissions, and
-- `carbon_inventory.is_editable` is a free-floating flag nothing maintains
-- against them.
--
-- Erasing the factors of a submitted footprint destroys the record of what was
-- declared. That is contrary to what the GHG Protocol and ISO 14064-1 ask to
-- preserve, and it is admissible here only because no footprint on the platform
-- holds data declared in earnest — the only two verification recognitions belong
-- to test organizations. This is a one-time exception and must not be read as
-- precedent: no later migration may erase declared data on this basis.
--
-- The clearing is destructive and irreversible in place. The rollback plan is
-- the `pg_dump` taken immediately before this migration runs, deliberately not
-- built into the migration itself.
--
-- Scope of the clearing:
--   * the active input of each line only (`is_active = true`), covering both
--     ACTIVE and OUTDATED lines — a parked line keeps its snapshot and can be
--     reactivated without passing through line synchronization. Superseded input
--     versions keep theirs: every reader filters `is_active = true`, so they are
--     audit trail nothing in the application consults.
--   * snapshots with an `emission_factor_id`, plus those with none whose frozen
--     source is not one of the custom sources ('Otro'). The second half reaches
--     the snapshots damaged before the factor identity was preserved: they lost
--     their factor id but kept the real catalogue source, which is what tells
--     them apart from a manual line, whose snapshot has a null id and a custom
--     source. No attempt is made to re-link them — with no real data behind it,
--     a reconciliation query would be written and justified to rescue nothing.
--   * a snapshot with neither a factor id nor a source is swept with them, which
--     is what the COALESCE expresses: a manual factor is one whose source is
--     custom, not merely one without a factor id. `createLineInput` writes
--     `manual_factor` only alongside a custom source, so a snapshot with no
--     source has no manual value behind it to lose.
--     `clearCatalogueFactorsOfLines` and `isFactorKeptOnLine` encode the same
--     definition of a catalogue-backed snapshot, and the three must agree or a
--     line slips through every one.
--   * a footprint with a NULL year is included. It is offered no factors at all,
--     so a snapshot there is as unofferable as one from another year.
--
-- Manual lines are left untouched, `manual_factor`, `manual_factor_source` and
-- `manual_factor_rate_unit_id` on the input included: their value and source
-- were typed by the user and no catalogue can restore them.
--
-- The one exception: a DIRECT input keeps its result. Its total was typed, not
-- computed, so a snapshot it happens to carry says nothing about it, and
-- deleting the result would leave the number on `direct_total_emissions` and
-- out of every total — the editor would keep showing it while
-- `carbon_inventory_subtotals_view` counted the line as zero and unfinished.
-- This bends nothing in the definition above, which is about snapshots: the
-- DIRECT line's snapshot still goes, in step 2. Only step 1 skips it.

-- Clearing, step 1: the computed results of the lines whose snapshot is going,
-- DIRECT inputs excepted
DELETE FROM "carbon_inventory_line_result"
WHERE "line_input_id" IN (
  SELECT "i"."id"
  FROM "carbon_inventory_line_input" "i"
    JOIN "carbon_inventory_line" "l" ON "l"."id" = "i"."line_id"
    JOIN "carbon_inventory" "ci" ON "ci"."id" = "l"."carbon_inventory_id"
    JOIN "carbon_inventory_line_factor" "f" ON "f"."line_input_id" = "i"."id"
  WHERE "i"."is_active" = TRUE
    AND "i"."input_type" <> 'DIRECT'
    AND "ci"."year" IS DISTINCT FROM 2025
    AND (
      "f"."emission_factor_id" IS NOT NULL
      OR COALESCE("f"."applied_factor_source", '') NOT IN ('Otro')
    )
);

-- Clearing, step 2: the factor snapshots themselves
DELETE FROM "carbon_inventory_line_factor"
WHERE "id" IN (
  SELECT "f"."id"
  FROM "carbon_inventory_line_factor" "f"
    JOIN "carbon_inventory_line_input" "i" ON "i"."id" = "f"."line_input_id"
    JOIN "carbon_inventory_line" "l" ON "l"."id" = "i"."line_id"
    JOIN "carbon_inventory" "ci" ON "ci"."id" = "l"."carbon_inventory_id"
  WHERE "i"."is_active" = TRUE
    AND "ci"."year" IS DISTINCT FROM 2025
    AND (
      "f"."emission_factor_id" IS NOT NULL
      OR COALESCE("f"."applied_factor_source", '') NOT IN ('Otro')
    )
);
