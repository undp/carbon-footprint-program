## Why

The Dominican Republic's Ministry of Environment (MMARN) reviewed the test environment and returned ten written observations (`Observaciones de la plataforma HC.pdf`), plus an accompanying workbook proposing a mapping of the national economic-activity classifier onto the platform's catalog. The platform currently ships a demo catalog ("País Demo") whose terminology, classifications, identifiers, territorial model and emission-factor options do not match Dominican law, institutions or infrastructure — an organization cannot correctly register itself or classify several of its emissions.

This change adapts the platform for the RD deployment. It lands on a long-lived branch that RD inherits and that is **not merged back into Huella Latam**, so deployment-specific catalog data is edited in place rather than parameterized per country.

## What Changes

**Terminology and labels**

- Rename step 1 from `Perfilamiento` to `Datos generales`, including the maintainer sidebar group and its help text.
- Replace `rubro` / `subrubro` with `Actividad económica principal` / `secundaria` across screens, maintainers, charts, API error messages and inline explanations.
- Set the tax identifier label to `RNC (Registro Nacional de Contribuyentes)` and remove hardcoded `Rut` literals that bypass the existing `TAX_ID_LABEL` constant.
- Rename the misleading `Actividad principal de la organización` field, which actually holds intensity denominators (`toneladas producidas`, `MWh generados`), so it stops colliding with the new economic-activity fields.

**Organization registration**

- Add an optional secondary economic activity, selected from the same catalog as the primary one and allowed to belong to a different sector.
- Replace the single free-text `Dirección / Región` field with a five-level Dominican territorial hierarchy (planning region, province, municipality, municipal district, sector/paraje) plus a separate free-text physical address.
- Label the representative's identifier as an identity document and state which one applies: cédula de identidad y electoral for Dominican nationals, passport for foreign nationals without one.
- State the documents that evidence identity and representation for inscription: RNC deed or DGII registration certificate, plus Registro Mercantil and proof of representation where applicable.

**Catalogs (deployment data)**

- Replace the demo activity catalog with the national economic-activity classifier at its two upper levels (17 sectors, ~66 activities), splitting the five activities that span two sectors, and remap the 29 dependent seed entries that resolve sectors by exact name.
- Replace the eight demo organization-size tiers with the four categories of Ley 187-17.
- Split `Distribución y Transmisión` into two independent activities.

**Methodology (deployment data)**

- Employee commuting: add `Teleférico` and `Taxi/vehículo de transporte individual`, spell out `Bicicleta`, and drop commuter and long-distance rail, which do not exist in the country.
- Solid-waste disposal: replace the destination options with open dump, controlled dump and sanitary landfill, plus `Otro (especifique)`.
- Scope 2 electricity: add isolated systems and `Otro (especifique)` alongside the national grid, and correct the explanation text that promises options the dimension does not offer.
- Assign every new dimension value a documented Dominican emission factor, giving each `Otro` the highest of its dimension so the escape hatch never understates.

**BREAKING** — for the RD deployment only: the activity catalog, organization-size tiers and methodology dimension values are replaced, not extended. Any inventory captured in the test environment against the demo catalog will not resolve.

## Capabilities

### New Capabilities

- `organization-economic-activity`: an organization declares a primary and an optional secondary economic activity from a two-level official catalog; covers the selection rules and the cross-sector allowance.
- `organization-territorial-location`: the organization's location as a hierarchical territorial catalog with dependent selectors, a single reference to the most specific node the user knows, ancestors derived from the hierarchy, and a free-text physical address. The catalog ships in the migration, has no maintainer today, and stays an ordinary table so one can be added later.
- `organization-inscription-identity`: the evidence of identity and representation required to register an organization — how the representative's identity document is named and explained, and the supporting documents demanded at inscription.

### Modified Capabilities

- `profiling-maintainer`: its Purpose and requirements name the `Perfilamiento` sidebar group and the `rubro` / `subrubro` catalogs; both are renamed.
- `profiling-catalog-behavior`: the per-row `impactedChildren` counts must include organizations that reference a subsector as their _secondary_ activity, otherwise an admin deletes a catalog row seeing an undercount.

## Impact

**Schema** — one additive migration: `secondary_subsector_id` and `territory_id` on `organization_data`, plus a new self-referencing `territory` table and the ten planning regions and thirty-two provinces that populate it. Both columns are nullable and the table starts empty, so the migration applies to a populated database without rewriting a row.

**API** — `organizations` (helpers, mappers, form handler), a read-only `territories` endpoint, `countrySectors` and `countrySubsectors` (secondary-activity reference counts), and the shared error copy in `ParentNotActiveError` and the sector/subsector services.

**Web** — `OrganizationFormDialog` gains the secondary activity, the territorial selectors and a physical address; `DeleteWarningDialog` gains a count and loses its hardcoded `ProfilingEntityLabel` union; ~36 files carry `rubro` or `perfilamiento` literals.

**Seed** — `countries.json` (country identity and ISO sweep across six files), `country_sector_subsectors.json`, `country_organization_size.json`, `methodologies.json`, `organization_main_activities.json` and `subcategory_recommendations.json` (the last two resolve sectors by exact name and throw when a name disappears), a new territorial catalog, and the subcategory explanation markdown that documents the changed dimensions.

**External dependencies** — MMARN must validate the 66-activity mapping; the Dominican emission factors for the new dimension values need documented sources; the territorial catalog comes from the ONE.
