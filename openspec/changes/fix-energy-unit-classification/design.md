## Context

The `measurement_unit` and `rate_measurement_unit` tables are populated from seed JSON files that ship with the codebase. Two of those rows — `kWh` and `MWh` — were classified under the `power` magnitude from the earliest commits, while `GJ` was placed under `energy`. The classification is physically wrong (watt-hour is energy, not power), but it didn't manifest as a visible failure because the conversion logic at `apps/api/src/features/carbonInventories/getCarbonInventoryMethodology/helper.ts` only attempts conversions _within_ a magnitude — so the cross-magnitude conversion that should be possible between `kg/kWh` and `kg/GJ` simply never happened.

The `add-magnitudes-maintainer` proposal (in flight) converts the `Magnitude` enum to a table without changing the classification — it preserves the historical mistake verbatim. This change fixes the underlying data once that proposal lands.

Constraints driving the design:

- **Single live deployment**: the platform has one production database, controlled by the maintainer. There is no fleet of independent country deployments yet that would require a coordinated migration.
- **Country-agnosticism**: when other deployments do come online, they will run `prisma migrate deploy` and then the seed scripts against fresh databases. They must get the corrected data without any manual operator step. The seed files are the source of truth for fresh deployments.
- **Canonical RMU coverage check**: `seedMeasurementUnits.ts` enforces that every `MeasurementUnit` has a corresponding `kg/<abbreviation>` RMU. Adding `W` and `kW` requires adding `kg/W` and `kg/kW` in lockstep.
- **Existing invariants**: integration tests assert "every magnitude has units" and "exactly one base unit per magnitude". Both must continue to hold after the change.

## Goals / Non-Goals

**Goals:**

- Correct the physical classification of `kWh` and `MWh` so they sit in the `energy` magnitude alongside `GJ`.
- Keep the `power` magnitude populated with real power units (`W`, `kW`) so the existing test invariants remain meaningful and so methodology authors who legitimately need power units have them out of the box.
- Make integration-test entity counts and magnitude-code lists self-derived from the seed JSON files, so future seed additions don't break the tests.
- Apply the fix to the live database via a committed, reviewable SQL script (not a Prisma migration), since manually executing a one-off script is appropriate for a single-deployment scenario.

**Non-Goals:**

- No Prisma migration file. If/when a second deployment ever comes online before this fix is applied to it, the operator will run the same committed SQL script (or it will be wrapped into a real migration at that point).
- No reclassification of other measurement units. The rest of the seed (`g`/`kg`/`ton`, `m`/`km`/`mi`, etc.) is correct.
- No new energy units (`MJ`, `BTU`, `therms`) — out of scope; future proposal if demand emerges.
- No re-add of the `measurement_unit_unique_base_per_magnitude` partial index that `add-magnitudes-maintainer` implicitly drops. Application-level enforcement remains in place; a follow-up proposal may revisit the DB index.
- No deeper test-content comparison — only count and magnitude-code derivation. Asserting that every seeded abbreviation appears in the response would be valuable but adds churn beyond this proposal's scope.

## Decisions

### Decision 1 — Repopulate the `power` magnitude rather than drop it

**Choice**: keep the `power` magnitude row and seed `W` (base, 1.0) and `kW` (1000.0).

**Alternatives considered**:

- **Drop the `power` magnitude entirely** — Simpler edit to seed data; smaller test changes. But it's a one-way door for system magnitudes (admins can add custom magnitudes via the maintainer UI but the system-magnitude set is shipped). Power is a real physical magnitude and methodologies that involve generator nameplate ratings, motor sizes, etc. legitimately need it. Removing it now and re-adding it later via the admin UI would also lose `isSystem = true`.
- **Add only `W` (no `kW`)** — Would satisfy the "every magnitude has units" invariant minimally, but kilowatt is the dominant practical unit in carbon accounting (kW thermal ratings, kW peak demand). Adding it now alongside the base is no harder.

**Rationale**: keeping the magnitude populated preserves the invariant that every system magnitude carries at least one MU and its canonical RMU. The cost is two extra rows in two seed files plus their canonical RMUs.

### Decision 2 — `GJ` remains the energy base; `kWh` and `MWh` get fractional `baseFactor` values

**Choice**: `GJ` stays `isBase = true, baseFactor = 1.0`. `kWh` becomes `baseFactor = 0.0036, isBase = false` and `MWh` becomes `baseFactor = 3.6, isBase = false`.

**Alternatives considered**:

- **`kWh` as the energy base** — Preserves the current `kWh.baseFactor = 1.0, MWh = 1000.0` values literally. But forces `GJ.baseFactor = 277.7777…` — an irrational decimal that loses precision in `double precision` storage. kWh is more commonly the unit users _enter_, but the base-unit choice is an internal representation, not a user-facing label.

**Rationale**: `0.0036` and `3.6` are exact in `double precision` (the underlying type of the `Float`-mapped `base_factor` column), whereas `277.7777…` is not. Conversion accuracy is preferred over preserving the current `kWh = 1.0` value, which is internal and not user-visible.

### Decision 3 — One-off committed SQL script, no Prisma migration

**Choice**: ship `packages/database/scripts/fix-energy-classification.sql` alongside the seed-JSON changes. Run it manually against the live database. No new migration file.

**Alternatives considered**:

- **A real Prisma migration** — Standard pattern. Every deployment converges automatically on `prisma migrate deploy`. But for a single live deployment fully under the maintainer's control, the migration adds review burden (defensive PL/pgSQL, conflict detection for hypothetically customized rows) for no marginal benefit over running a script once.
- **Pure seed update with no script** — Fresh deployments would get the corrected data, but the existing DB would silently keep the wrong classifications. The maintainer would still have to write SQL — keeping that SQL ephemeral in shell history rather than committed to the repo is worse for reproducibility.

**Rationale**: committed SQL is the smallest sufficient artifact. It is reviewable, version-controlled, and re-runnable. If a second deployment is ever spun up before this fix has been applied to it, that operator runs the same script. If multi-deployment becomes the norm later, the script becomes the canonical input to a real Prisma migration.

The script SHALL be wrapped in `BEGIN; … COMMIT;` and SHALL use `ON CONFLICT (abbreviation) DO NOTHING` on the INSERTs so re-running is safe.

### Decision 4 — Spanish names: `vatio` / `kilovatio`

**Choice**: `name: "vatio"` (W) and `name: "kilovatio"` (kW); RMUs named `"kg por vatio"` and `"kg por kilovatio"`.

**Alternatives considered**:

- **`watt` / `kilowatt`** — Matches the existing English-root precedent in the seed (`megawatt hora`, `kilowatt hora`).

**Rationale**: explicit preference for the Spanish-native form. The existing `…watt hora` rows are pre-existing — the new rows can use proper Spanish without forcing a rename of the existing rows in the same change. The legacy rows remain `kilowatt hora` / `megawatt hora` because their `abbreviation` is the user-facing identifier and renaming `name` would churn rows that don't otherwise need to be touched.

### Decision 5 — Test refactor: counts and magnitude codes only

**Choice**: a single new helper `apps/api/test/utils/seedCounts.ts` exports `SEED_COUNTS` and `SEED_MAGNITUDE_CODES`, derived from the `testing` dataset JSON files at import time. Three integration test files consume it.

**Alternatives considered**:

- **Full contents comparison** — Assert that every seeded abbreviation appears in the response, not just the count. Stronger guarantee against silent seed failures, but a bigger refactor than the bug fix justifies.
- **Inline the imports per test file** — No shared helper. Each test reads its own JSON. Smaller surface area but encourages drift.

**Rationale**: a shared helper is a small file and a single source of truth, but the assertions stay shallow (count + magnitude-code presence). Deeper content checks are valuable but out of scope.

## Risks / Trade-offs

- **The methodology helper begins producing different magnitude-pair buckets** → The `(power, mass)` bucket disappears for `kg/kWh + kg/MWh` and they join the `(energy, mass)` bucket with `kg/GJ`. This is the intended correctness improvement, but any UI that surfaces "convertible alternatives" will start offering `kg/GJ` to a user who previously selected `kg/kWh`. **Mitigation**: spot-check `getCarbonInventoryMethodology` integration tests during implementation; if any encode the broken grouping in fixtures, update them as part of this change.
- **The manual SQL script can corrupt data if run twice with different MU IDs or against a customized database** → The script will be idempotent for INSERTs (`ON CONFLICT DO NOTHING`) and the UPDATEs key on `abbreviation`, so re-running is safe in the common case. But if an admin has, e.g., already created a separate MU with `abbreviation = 'W'` under a different magnitude, `ON CONFLICT DO NOTHING` will silently leave that row alone — the operator must inspect post-script. **Mitigation**: header comment in the script explicitly stating the assumption that the maintainer has not customized these rows.
- **Test refactor introduces an import path that points outside `apps/api`** → `apps/api/test/utils/seedCounts.ts` imports from `@repo/database/.../seeds/data/testing/*.json`. **Mitigation**: confirm during implementation that the existing tsconfig / vitest config resolves the import; if not, the import path falls back to a relative path. This is a small risk, easily resolved at implementation time.
- **`baseFactor` precision** → `0.0036` and `3.6` are exact in `double precision`, but conversions involving multiple multiplications may accumulate floating-point error. The existing emission-factor conversion logic at `helper.ts` already operates in `Number` and clamps to a fixed precision downstream; no new precision risk is introduced.

## Migration Plan

1. Land the seed-JSON changes plus the test refactor in a single PR.
2. Once merged, manually apply `packages/database/scripts/fix-energy-classification.sql` to the live database. Verify the affected rows match the seed-JSON values with a few `SELECT` statements.
3. No rollback is provided in-band. If something goes wrong, the maintainer rolls back via the database's point-in-time recovery / snapshot. The script does not drop or destroy data — it only inserts rows and updates the `magnitude_id` / `base_factor` / `is_base` fields on two rows.
