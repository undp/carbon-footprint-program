# Running Several Git Worktrees at Once (opt-in)

How to run multiple [git worktrees](https://git-scm.com/docs/git-worktree) of this
repo side by side without them colliding over the API port or the local database.

> **This is opt-in and dev-only.** A single checkout needs none of it — leave it
> off and `pnpm dev` uses the defaults (API `8080`, web `5173`). It changes only
> local dev ports and the local database name; it never touches remote/cloud
> `DATABASE_URL`s, CI, or tests.

## Table of Contents

1. [When You Need This](#when-you-need-this)
2. [Turning It On](#turning-it-on)
3. [What It Does](#what-it-does)
4. [First-Time Setup in a Worktree](#first-time-setup-in-a-worktree)
5. [Deleting a Worktree](#deleting-a-worktree)
6. [Automating Setup/Teardown (ADEs)](#automating-setupteardown-ades)
7. [Login / OIDC Behavior](#login--oidc-behavior)
8. [Common Pitfalls](#common-pitfalls)
9. [How It Works Under the Hood](#how-it-works-under-the-hood)

---

## When You Need This

By default every worktree of this repo binds the **same** API port (`8080`) and
talks to the **same** local database. Run two at once and the second API fails to
bind, and both share (and corrupt) each other's data.

Turn on per-worktree isolation when you want to keep two or more worktrees running
at the same time — e.g. one per feature branch, or an Agentic Development
Environment (Emdash, Superset, …) that spins up a worktree per task.

If you only ever work in one checkout at a time, **skip this** — the defaults are
simpler.

---

## Turning It On

Isolation is opt-in **per worktree**, via a single line in that worktree's `.envrc`
(managed by [direnv](https://direnv.net/)). Uncomment the last line:

```bash
eval "$(node scripts/dev/worktree-env.mjs)"
```

Then `direnv allow`. Keep it as the **last** line of `.envrc` so it sees the values
defined above it.

> **Tip for ADE users:** enable this once in your **primary clone's** `.envrc`.
> `worktree-setup.sh` copies `.envrc` from the primary clone into each new
> worktree, so every worktree inherits the setting automatically. See
> [Automating Setup/Teardown](#automating-setupteardown-ades).

---

## What It Does

The `worktree-env.mjs` script prints shell `export`s that `.envrc` evals. For this
worktree it sets:

| Variable                               | Effect                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `API_HOST` / `API_PORT` / `API_ORIGIN` | A per-worktree API port (see [registry](#how-it-works-under-the-hood)), replacing `8080`.     |
| `VITE_API_BASE_URL`                    | Repointed at that API port so the web app talks to the right backend.                         |
| `DATABASE_URL`                         | A per-worktree database name (e.g. `huella_latam` → `huella_latam_1a2b3c4d`), localhost only. |
| `VITE_OIDC_*_REDIRECT_URI` (unset)     | Cleared so OIDC login follows the **actual** web origin/port instead of a hardcoded one.      |

Every tool that reads the environment follows automatically — the app,
`prisma migrate`, `pnpm db:seed`, `pnpm dev:studio`.

- **API port** comes from a small registry shared by all worktrees, giving each a
  unique port in `8100–8999` with **zero collisions**, stable across reloads.
- **Web port** is left to Vite, which binds the next free port itself (`5173`,
  `5174`, …) — collision-free by design.
- **Remote/cloud `DATABASE_URL`s are left untouched** — only a localhost database
  name is rewritten.
- **Tests are unaffected** — they use their own Testcontainers Postgres.

---

## First-Time Setup in a Worktree

After uncommenting the line and running `direnv allow`, create this worktree's
database once:

```bash
pnpm db:provision
```

`db:provision` is **non-destructive**: it runs `prisma migrate deploy` (which
creates the database if it doesn't exist yet), then seeds it. The first direnv load
prints a one-time reminder of this step.

Provisioning stays **manual** — the env script never touches the database.

> Use `pnpm db:restore` **only** to wipe and rebuild an existing worktree DB
> (⚠️ destructive). For the first provision, use `pnpm db:provision`.

---

## Deleting a Worktree

```bash
pnpm db:drop:worktree
```

This drops **this worktree's** private database. Its API port is reclaimed
automatically the next time a worktree is assigned a port — no manual cleanup.

`db:drop:worktree` only ever drops a localhost per-worktree database; it will never
touch the shared base DB or a remote server.

---

## Automating Setup/Teardown (ADEs)

If you use an Agentic Development Environment (Emdash, Superset, …) with lifecycle
hooks, point them at the versioned scripts so a new worktree comes up ready and a
removed one cleans up after itself:

- **On create** → `bash scripts/dev/worktree-setup.sh` — seeds the gitignored env
  files (`.envrc`, `infra/.envrc`) from the primary clone, `direnv allow`s them,
  then runs `pnpm install`, `pnpm build`, and `pnpm db:provision`. Idempotent.
- **On destroy** → `bash scripts/dev/worktree-teardown.sh` — drops this worktree's
  database via `pnpm db:drop:worktree`; the API port is released automatically.

Because setup copies `.envrc` from the primary clone, **enable isolation once in
your primary clone's `.envrc`** (uncomment the `eval "$(node scripts/dev/worktree-env.mjs)"`
line) and every worktree seeded from it inherits it — the setup script never edits
`.envrc` itself.

Example — Superset `.superset/config.json` (this file stays local / gitignored):

```json
{
  "setup": ["bash scripts/dev/worktree-setup.sh"],
  "teardown": ["bash scripts/dev/worktree-teardown.sh"]
}
```

For Emdash, set the same two commands as its worktree setup/teardown hooks. The ADE
config is tool- and machine-specific — keep it local (gitignored); only the scripts
it calls are versioned here.

---

## Login / OIDC Behavior

Because a floating web port changes the browser origin, the OIDC redirect URI moves
with it. How each provider copes:

- **Keycloak (recommended for worktree dev):** the dev realm accepts any
  `http://localhost:*` redirect URI and web origin, so a worktree whose web lands
  on any port completes the OIDC flow with no extra setup. See
  [Keycloak Authentication Setup](../infrastructure/KeycloakAuthenticationSetup.md).
- **Azure Entra:** its SPA registration requires **exact** redirect URIs (no
  wildcard), so a floating web port won't match. Either prefer Keycloak for
  multi-worktree dev, or register the dev port range in the Azure app registration.
  See [Azure Authentication Setup](../infrastructure/AzureAuthenticationSetup.md).

---

## Common Pitfalls

| Symptom                                                                  | Cause                                                                                          | Fix                                                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Enabled the line but nothing changed (still port 8080)                   | direnv not reloaded, or the `eval` line isn't the last line of `.envrc`                        | Run `direnv allow`; move the `eval` line to the bottom so it sees the values above it.                    |
| `prisma migrate`/app errors: database `huella_latam_xxxx` does not exist | Provisioning is manual — the env script never creates the DB                                   | Run `pnpm db:provision` once in this worktree.                                                            |
| Ran `pnpm db:restore` on a brand-new worktree and it failed / wiped data | `db:restore` is destructive and expects an existing DB                                         | Use `pnpm db:provision` for the first provision; reserve `db:restore` for wiping an existing worktree DB. |
| `redirect_uri` / login mismatch on a non-`:5173` web port                | Using Azure Entra, whose SPA registration has no wildcard                                      | Use Keycloak for worktree dev, or register the dev port range in the Entra app registration.              |
| Per-worktree databases piling up after deleting worktrees                | `git worktree remove` doesn't drop the database                                                | Run `pnpm db:drop:worktree` before/after removal (or wire up the teardown hook).                          |
| Changed `DATABASE_URL` to a remote host and it got ignored               | The script only rewrites **localhost** database names; remote URLs are intentionally untouched | Expected — isolation applies to local dev only.                                                           |

---

## How It Works Under the Hood

The **API port** is assigned from a registry file kept in the repo's **common
`.git` directory** — a single file shared by every worktree of the repo. Because
all worktrees see the same registry:

- Each worktree is assigned a unique port in `8100–8999` (clear of `8080`/`8081`,
  MinIO `9000`, Postgres `5432`, and Vite `5173+`) with **zero collisions**.
- The port is assigned **once** and read back on every direnv reload, so it's
  **stable** for the life of the worktree.
- When a worktree is deleted, `worktree-env.mjs` prunes it from the registry on the
  next assignment, so its port is reclaimed automatically.

The **database name** is derived from the worktree path (a short hash), so parallel
worktrees never share a database. Only a `localhost`/`127.0.0.1` `DATABASE_URL` is
rewritten; anything pointing at a remote host is left as-is.

The **web port** is deliberately not managed — Vite already binds the next free
port itself, which is collision-free and self-healing, and the dev Keycloak realm
accepts any localhost redirect URI (so login still works wherever Vite lands).

Source: [`scripts/dev/worktree-env.mjs`](../../scripts/dev/worktree-env.mjs),
[`worktree-setup.sh`](../../scripts/dev/worktree-setup.sh),
[`worktree-teardown.sh`](../../scripts/dev/worktree-teardown.sh).
