## Context

**Where the rule lives today.**

- `validateSourceConsistency` (`apps/api/src/features/emissionFactors/helpers.ts`) refuses a create or an update that would give a subcategory a second active source in one year (409 `EMISSION_FACTOR_SOURCE_CONFLICT`). Its TODO records how to lift it: delete it and add `source` to the duplicate key.
- `checkDuplicateEmissionFactor` keys on `(subcategory, required dimension values, year)`. It leaves out the source, the rate unit and the optional dimensions, and it is the check that actually blocks.
- The partial unique index `emission_factor_unique_subcategory_dims_source` keys on `(subcategory_id, dimension_value_1_id, dimension_value_2_id, source, year)` for non-deleted factors. It already includes the source. PostgreSQL treats NULLs as distinct, so factors with a missing dimension value have no database uniqueness, before and after this change.
- The maintainer mirrors the rule with a source lock (`emissionFactorSourceLock.ts`). It reads the persisted rows of the row's `(subcategory, year)` group, writes the group's source into the row and announces the replacement.

**Two cases behind "several sources".** The rule blocks two things with different costs:

```
 Subcategory «Combustiones estacionarias», 2026

 A. different sources for different activities
    Diésel ─▶ national factor          one line → one factor
    GLP    ─▶ DEFRA 2025               the platform picks it

 B. alternative factors for one activity
    Diésel ─┬▶ national factor         one line → two factors
            └▶ DEFRA 2025              the user picks
```

Deleting `validateSourceConsistency` alone enables A, because the duplicate key still admits one factor per activity. Adding the source to the key enables B. This change does both.

**Capture.** `EmissionEditorFactorSourceCell` offers the sources of the factors that match the line's dimension values (a factor with a NULL dimension value matches any value) and the compatible rate unit (`getAvailableFactors`, `getAvailableSources`), plus «Otro». On every cell edit, `tryToLoadDetermineFactorPlatform` selects the source when only one is offered. With several it does nothing, and a source is required for the line to be complete. `handleFactorSourceChange` loads the factor of the chosen source, and keeps the line's factor when the source matches several factors and that factor is still among them.

**Platform.** PostgreSQL compares `text` exactly: `"DEFRA 2025"`, `"defra 2025"` and `"DEFRA 2025 "` are three values, in the index and in Prisma's `where`. A country deployment that runs this change on SQL Server got case and trailing-space equality from its collation. This port cannot rely on that.

**Origin.** The change already runs in a country deployment. Its code applies to `main` without conflicts. This design keeps its decisions and changes one: how the duplicate check compares sources (D3).

## Goals / Non-Goals

**Goals:**

- A subcategory can hold active factors of several sources in one year, from the maintainer.
- Same key with another source is accepted, and with the same source is a duplicate. Letter case and whitespace do not make a source different.
- Capture selects the source alone when a line has one, and requires the user's choice when it has several, also after later edits to the line.
- No migration, no change to stored footprints.

**Non-Goals:**

- A recommended or default source among several.
- Showing the factor value in the capture source selector.
- The rate unit in the duplicate key, and database uniqueness for factors with a missing dimension value.
- Suggesting the subcategory's existing sources in the maintainer.
- Subcategory help texts that tell users not to change «Fuente factor».
- Copying factors between years, which `main` does not have.

## Decisions

### D1. The rule is deleted, not made configurable

`validateSourceConsistency`, `EmissionFactorSourceConflictError` and its web message are removed. The create and update services stop calling it.

- _Alternative_: a per-deployment flag, like `CHATBOT_ENABLED`, that keeps the rule on. Rejected: it keeps two code paths, the maintainer lock and two sets of tests included. The guarantee it would give is already in the deployment's hands: a country that wants one source per subcategory loads one source in its catalogue. The TODO on `validateSourceConsistency` prescribes deletion.

### D2. The duplicate key gains the source

`checkDuplicateEmissionFactor` takes `source`: the key becomes `(subcategory, required dimension values, year, source)`.

The update service passes the effective source and runs the check when the subcategory, a dimension value, the year **or the source** changes. Without the source trigger, renaming a factor's source onto another factor of the same key would pass.

`EmissionFactorDuplicateError` keeps its code. Its web message names the source and the year, and says how sources compare (D3): «Ya existe un factor de emisión con la misma sub-categoría, variables, fuente y año. Las fuentes que solo difieren en mayúsculas o espacios cuentan como la misma.» Without the second sentence, an administrator who types `Defra 2025` next to `DEFRA 2025` gets a duplicate error for sources that look different.

- _Alternative_: add the rate unit to the key at the same time. Rejected: the key leaves the rate unit out today, and changing that is a separate change.

### D3. The duplicate check compares sources in the application

The check queries the active factors of the key without the source, that is `(subcategory, required dimension values, year)` minus `excludeId`, selecting their `source`. It then compares each one with the incoming source after normalizing both sides: trim, collapse each whitespace run to one space, lower-case. A match is a duplicate.

The set it reads is the factors of one activity in one year: a handful of rows, whatever the catalogue size.

Normalizing the stored side too covers rows written before D4, which the maintainer may have stored with stray whitespace.

- _Alternative_: `source: { equals, mode: "insensitive" }` in the `where`. It has precedent in the codebase (`organizationIdentityCollision.ts`). Rejected: Prisma 7's PostgreSQL query compiler builds insensitive filters with `ILIKE` (it carries `ILIKE` and no `LOWER(`), where `_` and `%` are wildcards, so `"IPCC_2006"` would likely be a duplicate of `"IPCC-2006"`. Even if `equals` escaped them, it would not fold internal whitespace on rows stored before D4. The application comparison avoids both questions.
- _Alternative_: let letter case distinguish sources, as PostgreSQL does. Rejected: the one-source rule used to catch `"Defra 2025"` next to `"DEFRA 2025"` as a conflict. Without the rule and without this check, the typo becomes a second option in capture, which the user cannot tell apart.
- _Alternative_: a unique index on `lower(source)`. Rejected: it needs a migration, still leaves factors with a missing dimension value uncovered, and the application check is the one that blocks anyway.

### D4. The source is normalized in the contract

A shared `EmissionFactorSourceSchema` in `packages/types` trims the source and collapses repeated whitespace, then requires at least one character. The create and update request schemas use it. The service stores the normalized value. Letter case is stored as entered.

Its comment explains the whitespace only, and names no database. D3 owns the case comparison.

The maintainer's form schema is unchanged: the server normalizes, and the grid shows the stored value after the refetch. The seed bypasses the API, so its sources are checked once for repeated whitespace and case variants (tasks).

- _Alternative_: also suggest the subcategory's existing sources in the maintainer. Rejected: a real typo is the administrator's to avoid.
- _Alternative_: case-fold the stored source. Rejected: rewriting the administrator's capitalization changes what reports print.

### D5. Capture re-resolves a line that keeps its source

`tryToLoadDetermineFactorPlatform` decides through a pure helper, `resolveFactorSource`, in `emissionFactorService.ts`. The helper takes the sources offered to the line and the line's current source, and returns one of three actions. The rows are evaluated in order, and the first that matches wins: with exactly one source offered, a line holding another source gets the offered one, not a cleared field. When no row matches (no source offered and none held), the action is nothing.

| Offered sources | Line's source                        | Action                                                                |
| --------------- | ------------------------------------ | --------------------------------------------------------------------- |
| exactly one     | any                                  | select it (today's behaviour)                                         |
| several         | one of them                          | select it again, so `handleFactorSourceChange` re-resolves the factor |
| any             | a catalogue source no longer offered | clear the source and the factor                                       |
| several         | none                                 | nothing: the user chooses                                             |

The hook maps the actions to `handleFactorSourceChange` and `resetFactorRelatedFields`. «Otro» lines never reach the helper, as today.

Why it is needed: a measurement-unit change clears the factor and keeps the source. With several sources nothing reloads it, and choosing the same source again fires no `onChange` (MUI's `SelectInput` skips an unchanged value). The line is left with a source, no factor, and no way back except picking another source and returning. An optional-dimension change has the same gap: the line keeps a factor resolved for the previous value. A required-dimension change already clears the source, so the user chooses again.

The "no longer offered" row also covers a gap that exists today with one source: after a unit change that leaves only «Otro», the line kept a catalogue source the selector no longer lists.

- _Alternative_: reset the source on every unit change. Rejected: it discards a choice the user made on purpose, for an edit that has nothing to do with the source.

### D6. The maintainer drops the lock

`emissionFactorSourceLock.ts` and its test are deleted. `EmissionFactorSourceCell` loses `isSourceLocked`, `lockedSource`, the write-back effect, the snackbar and both lock renders, and keeps the free-text autocomplete with its error message. `useEmissionFactorColumns` loses `getPersistedRows` and `resolveLockedSource`. `EmissionFactorsMaintainerScreen` loses `persistedEmissionFactors` and its getter, which only the lock read.

### D7. What does not change, and why

- **Unit conversion.** `getCarbonInventoryMethodology` derives converted factors keeping each factor's source. Two sources that overlap after conversion become two options, which is the intended choice.
- **Seed collision check** (`emission-factor-unit-uniqueness`). It already keys on the source, so two sources of one activity are not a collision.
- **Dashboard and aggregates** group by subcategory and category, not by source.
- **Emission-factor report and export** list one row per factor id with its source, so two sources of one activity are two rows.
- **Verifier's view and line detail** show each line's frozen source.
- **Line synchronization** freezes the source the client sends, without checking it against the referenced factor. That is the same trust it gives the value today, and the usage guard keeps a used factor's source from changing.
- **Footprint duplication and methodology duplication** copy factors and lines as they are.

### D8. Help text and user manual

The «Fuente» row of `emission-factors-maintainer.md` states that a subcategory may use several sources in one year, and the duplicate rule with the source, including that sources differing only in letter case or whitespace count as the same one (D3).

The seed upserts standalone explanations by slug, so a new deployment gets the text. A deployment already in production does not re-run the seed: `seed.ts` runs the whole seed, and the upsert would overwrite any local edit of that help text. Its administrator replaces the «Fuente» row by hand in the explanations maintainer (`PATCH /api/admin/explanations/:slug`), with the text the pull request carries.

- _Alternative_: re-run the seed. Rejected: it runs every seed step over live data and overwrites local edits.
- _Alternative_: a data migration that rewrites the text. Rejected: it also overwrites local edits, and puts per-deployment content into schema migrations.

The methodology maintainer chapter of the user manual (`user_manual/mantenedor_metodologia/`) states the one-source rule (the «desglose por gas» note) and says that capture loads the factor alone. Both sentences change, and the chapter's PDF is exported again with the `user-manual:manual-slides` export. The export also picks up an earlier HTML-only edit of that chapter («Factor Propio» removed). The calculator chapter already describes the choice with several sources.

The per-subcategory texts that say «El campo "Fuente factor" no debes modificarlo» stay true while each activity has one source, and they change with the data that gives an activity a second one.

### D9. Specs and archive order

The year-scoping delta modifies "Uniqueness accounts for the year across all enforcement layers", whose base lives in `add-emission-factor-year`. That change is not archived, so `openspec archive` of this one fails until it is: archive `add-emission-factor-year` first. The order was checked on a copy of `openspec/`. The capture rule is a new capability, `emission-capture-factor-link`, because no spec on `main` describes how capture picks a line's source.

## Risks / Trade-offs

- **[A user picks the source that gives fewer emissions]** → A methodology cost, stated in the proposal and the pull request. The platform states no preference (no recommended source). Criteria per subcategory, if a methodology team writes them, go into its help text with the data.
- **[A mistyped source becomes a second option]** → D3 and D4 remove case and whitespace variants within one key. A real typo remains the administrator's to avoid and fix in the maintainer.
- **[A factor with a missing dimension value offers its source to every value of that dimension]** The API does not require a value for a required dimension, so a factor with a NULL value and a specific one have different keys and both reach the same line. With different sources, the line gets a choice even in case A. With sources that differ only in case (`"DEFRA 2025"` and `"defra 2025"`), D3 does not catch it, and capture shows two options that read alike. → That is the catalogue's design, and the maintainer shows both rows. It needs an administrator to load both factors with the case variant, and it is fixed by editing one source.
- **[Rollback with mixed data]** Reverting restores the rule. Any later edit of a factor in a subcategory and year that already mixes sources answers 409 until the sources are aligned. → Align the sources in the maintainer, or keep the change.
- **[Concurrent creates of the same key and source]** Two simultaneous requests can both pass the application check. For factors with both dimension values, the index refuses the second only when the sources are byte-equal. → Unchanged from today and accepted in `add-emission-factor-year` (admin-only, rare).

## Migration Plan

No schema change and no migration.

- New deployments get the help text through the seed.
- Deployments already in production: after upgrading, an administrator replaces the «Fuente» row of the «Mantenedor de factores de emisión» help in the explanations maintainer, with the text in the pull request (D8).

Rollback: revert the pull request (see the rollback risk), and restore the previous help text the same way.

## Open Questions

None for the implementation. Per-subcategory criteria for choosing among sources belong to each deployment's methodology team, with the data that introduces them.
