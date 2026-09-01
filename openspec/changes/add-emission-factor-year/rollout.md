# Rollout (tasks 11.3–11.4)

These are deployment-time steps, not code. They are written down here because the
order matters and because the classification gate in step 1 is a decision, not a
command.

## Why order matters

This change is a breaking contract change in both directions at once:

- the API cannot start against an un-migrated database — `emission_factor`
  gains two NOT NULL columns and `carbon_inventory_line_factor` a new one;
- the web client sends the new discriminated `factorSelection` union, which an
  old API would reject, and the old flat fields, which the new API rejects.

The repository's compose deployment already sequences this correctly, because
`api` and `web` come up together from one `up` and migrations are a separate
manual profile. There is no window in which a new web talks to an old API, so the
only ordering requirement is the usual one: migrate first.

## Steps

1. **Confirm the classification still holds** (gate for 11.4 as much as 11.3).
   Run, against the production database:

   ```sql
   SELECT DISTINCT source FROM emission_factor WHERE status <> 'DELETED';
   ```

   Every value must appear in `factor-classification.md`. Anything else is
   unclassified: the migration will abort on it by design, and the fix is a
   methodology decision (dated with which year, or confirmed transversal),
   recorded in that file and added to the migration's map — not a guess.

2. **Run the migration checks against a restored copy of production**, not
   against production:

   ```bash
   PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... TEMPLATE_DB=<restored copy> \
     ./verify-migration.sh
   ```

   The third check prints the resulting classification, how many duplicate unit
   representations were retired, and asserts no duplicate business key survives.
   Read those numbers before continuing; a surprising count means the production
   catalog differs from what was reviewed.

3. **Migrate**, then bring the stack up:

   ```bash
   docker compose -f docker-compose.prod.yml --profile migrate up migrate
   docker compose -f docker-compose.prod.yml up -d api web
   ```

   The migration runs in a single transaction, so an abort leaves the database
   exactly as it was — verified: a failed preflight rolled back cleanly with no
   columns left behind.

4. **Spot-check reproducibility** on a captured inventory that existed before the
   migration: its lines must keep the same applied value, unit and source, and
   `applied_factor_year` must match the year of the factor each line already
   pointed at. Nothing should have been recalculated.

## 11.4 — Loading more vintages

Additional years and providers are data, not code, and they are deliberately
**not** part of this change. Load them only after steps 1–4 pass, and watch one
thing specifically first:

**Methodology payload size.** `GET /carbon-inventories/:id/methodology` expands
every canonical factor into each unit of its family. Adding a second vintage of
DEFRA roughly doubles that subcategory's factor array. The current payload is
fine, and the design notes the eventual optimization (send canonical factors plus
conversion metadata and let the client convert), but that is a separate change.
Measure the response size after the first new vintage lands rather than after
five.

A second consequence is intentional and worth telling the methodology team about
before they load anything: **more providers means fewer automatic selections.**
Capture preselects a factor only when the winning year rank holds exactly one
canonical factor. Adding `IPCC (2025)` next to `DEFRA (2025)` for the same
activity turns a silent default into an explicit choice for every organization
capturing that activity. That is the intended behaviour — the platform will not
pick between two legitimate scientific sources — but it is a visible change in
how much typing capture requires, so it should be a deliberate decision rather
than a side effect of loading a file.
