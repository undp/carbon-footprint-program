# RD Deployment Branch (`rd/integration`)

The Dominican deployment does not run `main`. It runs `rd/integration`, a
long-lived branch that carries deployment-specific data and copy for MMARN and
that is **never merged back into Huella Latam**.

## Why it exists

The platform is a regional public good, but a national registry has to speak the
country's own regulation: its economic-activity classifier, its company-size law,
its territorial subdivisions, its tax identifier and its emission factors. Those
are edited **in place** in `tools/seed/src/data/base/` rather than parameterized
per country, because a parameterization only pays off if the branch returns
upstream — and it does not.

What lives on the branch:

- the country record and its ISO code (`República Dominicana` / `DO`);
- the national economic-activity catalog;
- the four Ley 187-17 organization-size tiers;
- the territorial hierarchy of Ley 345-22 — its ten planning regions, thirty-two
  provinces and 157 municipios;
- Dominican terminology (`Actividad económica` instead of `rubro`, `RNC` as the
  tax identifier, `Datos generales` as step 1);
- the methodology's Dominican dimension values and emission factors;
- the Dominican identity of the web app: the `Huella de Carbono República
Dominicana` name and mark (`apps/web/src/config/brand.ts`), the institutional
  navy palette (`apps/web/src/theme/palette.ts`), the landing and the "Sobre la
  iniciativa" copy MMARN reviewed, and the Gobierno de la República Dominicana
  footer.

The identity is deployment data too, and it is likewise edited in place. See
[Editing Public-Page Content](../development/public-pages-content.md#brand-and-palette)
for which file holds what.

## Upstream policy: frozen, not tracked

**Only security fixes are cherry-picked from Huella Latam. There is no periodic
rebase and no scheduled merge from `main`.**

Upstream edits to `tools/seed/src/data/base/*.json` conflict with the Dominican
catalogs indefinitely — the same files are rewritten on both sides — so a routine
rebase would mean re-resolving the whole catalog on every sync, with a real risk
of silently reintroducing demo data into a national registry.

When something from upstream is needed:

1. **Security fix** — cherry-pick the specific commit onto `rd/integration`,
   verify the gates (`pnpm format && pnpm lint && pnpm type-check`, the API test
   matrix and `Test (web)`), and deploy.
2. **Feature or fix worth having** — take it deliberately, as a decision with an
   owner. Expect to resolve seed-data conflicts by hand, and to keep **both**
   sides of every conflicting file: the Dominican catalog changes and whatever
   upstream did to the rows the deployment did not touch.
3. **Anything touching the catalogs** — treat as a data decision, not a merge.
   The Dominican catalog is validated by MMARN; upstream is not.

### Cherry-pick or rebase

Cherry-picking is not the cheaper option it looks like. Anything landing on
`rd/integration` moves the root, and moving the root rebases every branch of the
stack anyway — so a cherry-pick costs one chain rebase _plus_ its own conflict
resolution. When most of what upstream has is wanted, rebasing the stack onto
`main` is the smaller operation and leaves the branch genuinely on top of
upstream instead of carrying a partial copy of it.

**Sync of 2026-08-26.** The stack was rebased onto `main` at `34f66c3b`, seven
commits ahead. Two files conflicted: `methodologies.json` twice and
`manual-testing-emission-capture.md` once. What it bought:

- **Steel and zinc process factors were understated 1000×** on this branch —
  `1.46 kg/ton` where the IPCC figure is `1460`. Inherited from the demo dataset,
  not introduced here, and corrected upstream in the meantime.
- **`Otro` was the first option in the Scope 2 dropdown.** Both capture endpoints
  order dimension values `value: "asc"`, so the escape hatch sorted ahead of
  `SENI`. Upstream now pins every `Otro` wording last.

Both were defects this branch would have shipped. The rule that follows: when the
conflict is in `methodologies.json`, verify the result by diffing factors
programmatically against `main` — not by reading the merge.

## Reseeding is destructive

`seed.ts` skips entirely when `country.count() > 0`, so replacing a catalog means
`pnpm db:reset`. Every inventory captured against the previous catalog is lost.
Coordinate the reset window with MMARN before deploying catalog changes — this is
not reversible in place.

## Going the other way

Several Dominican observations describe most of the region: open dumps, cable
cars, isolated grids, ride-hailing. Upstreaming them into the demo dataset is
worthwhile and out of scope for this branch — it would be a separate change
against `main`, not a merge from here.
