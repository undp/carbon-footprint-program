# Deployment Scenarios

Huella Latam is deployed independently by each country, and no two productions are alike: one runs `api + web` against an existing PostgreSQL, another also wants the database in Docker, a future one may add object storage. To support that without forking compose files, the stack is **layered**:

- **`compose.yaml`** (repo root) — the production-grade base: `api` + `web`, strict required vars, `NODE_ENV=production`. It never runs alone.
- **`compose/*.yaml`** — overlays, each named after the component or mode it contributes:

  | Overlay                    | Adds / changes                                                                                                    |
  | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
  | `compose/db.external.yaml` | Nothing runs in Docker for the DB — declares the required `DATABASE_URL` to an external PostgreSQL                |
  | `compose/db.bundled.yaml`  | `postgres` container + one-shot `migrate` (migrations + seed); derives `DATABASE_URL` from the `POSTGRES_*` vars  |
  | `compose/dev.yaml`         | Development mode: `NODE_ENV=development`, forced-user auth vars, validation-bypass flags. **Never in production** |

  Every scenario stacks **exactly one `db.*` overlay** on the base.

- **`deploy/<scenario>/.env.example`** — one committed template per supported scenario. The template _is_ the scenario: its `COMPOSE_FILE` variable selects the overlay chain, so the env file is the deployment's complete, auditable configuration.

## Running a scenario

The command shape is identical for every scenario — the env file decides everything. From the repo root:

```bash
cp deploy/<scenario>/.env.example <gitignored-copy>   # then fill it in
docker compose --env-file <gitignored-copy> up -d
```

Conventional copy names (both gitignored, so a builder machine can hold a dev and a prod file side by side): `.env.dockercompose` for dev, `.env.prod.dockercompose` for production.

`docker compose --env-file .env.dockercompose config` prints the fully merged, interpolated configuration — use it to audit exactly what will run before booting.

## Supported scenarios

| Scenario           | `COMPOSE_FILE` chain                                    | Use                                                                                                                      |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `dev`              | `compose.yaml:compose/db.bundled.yaml:compose/dev.yaml` | Full local stack — see [docker-compose.md](../docs/operations/docker-compose.md)                                         |
| `prod-external-db` | `compose.yaml:compose/db.external.yaml`                 | On-premise production, external PostgreSQL — see [production-deployment.md](../docs/operations/production-deployment.md) |

## Composing a new scenario

A new deployment shape usually needs **no new yaml** — only a new env file. For example, a small production with the database in Docker:

```bash
COMPOSE_FILE=compose.yaml:compose/db.bundled.yaml
COMPOSE_PROJECT_NAME=huella-latam-prod
IMAGE_TAG=prod
# ... the rest of the prod-external-db template, with POSTGRES_* instead of DATABASE_URL
```

> ⚠️ With `db.bundled.yaml`, migrations **and seeds** run automatically on every boot. Read the seed one-shot warning in the [production deployment guide](../docs/operations/production-deployment.md#migrations--seed-manual-from-a-dev-machine) before using it against a production database — in particular, the `AZURE_STORAGE_*` vars must be set before the first seed.

A new _component_ (e.g. a MinIO container, a reverse proxy) becomes a new overlay in `compose/`, named after what it adds (`storage.minio.yaml`, `proxy.nginx.yaml`), and existing scenarios remain untouched.

Conventions when adding overlays:

- **Name by component/mode, never by environment** — there is no `prod.yaml`; production is the base's default and every combination of overlays is a legitimate production except those including `dev.yaml`.
- **Keep overlays additive**: add whole services or set keys the base doesn't set. Avoid two overlays writing the same key of the same service — merge precedence (last `-f` wins) is where silent misconfiguration hides.
- **Required vars (`:?`) live in the overlay that owns them**, not in the base, when another overlay may provide the value a different way (interpolation runs per file _before_ merging — a `:?` in the base would fail even if an overlay overrides the value).

## Mechanics

- `COMPOSE_FILE` uses `:` as separator (Linux/macOS); paths are relative to the directory you run `docker compose` from — always run from the repo root (or the directory where you copied the files, preserving the `compose/` layout).
- `COMPOSE_PROJECT_NAME` namespaces containers, networks, and volumes, so a dev and a prod stack can coexist on one host.
- Requires Docker Compose v2 (`docker compose version`); `COMPOSE_FILE` inside `--env-file` is honored by Compose v2.x.
