# Huella Latam

A platform — a **digital public good for Latin America** — for measuring, managing, and reducing carbon footprints.

Monorepo (pnpm + Turborepo): a Fastify + Prisma API (`apps/api`), a React + Vite + MUI web app (`apps/web`), shared libraries (`packages/*`), and Azure Bicep infrastructure (`infra/`).

## Documentation

Full documentation lives in **[`docs/`](./docs/README.md)** — start with the index. Key entry points:

| Topic                           | Where                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Getting started (local dev)** | [`docs/development/local-setup.md`](./docs/development/local-setup.md) — canonical                                             |
| Documentation index             | [`docs/README.md`](./docs/README.md)                                                                                           |
| Project overview                | [`docs/overview/project-overview.md`](./docs/overview/project-overview.md)                                                     |
| System architecture             | [`docs/architecture/system-architecture.md`](./docs/architecture/system-architecture.md)                                       |
| Tech stack                      | [`docs/architecture/tech-stack.md`](./docs/architecture/tech-stack.md)                                                         |
| Data model                      | [`docs/data-model/developer-guide.md`](./docs/data-model/developer-guide.md)                                                   |
| Environment variables           | [`docs/development/environment-variables.md`](./docs/development/environment-variables.md)                                     |
| API conventions                 | [`docs/development/api-conventions.md`](./docs/development/api-conventions.md)                                                 |
| Testing                         | [`docs/development/testing.md`](./docs/development/testing.md)                                                                 |
| Contributing                    | [`docs/development/contributing.md`](./docs/development/contributing.md)                                                       |
| Deployment (Azure)              | [`docs/infrastructure/Deployment.md`](./docs/infrastructure/Deployment.md)                                                     |
| App / package READMEs           | [`apps/api`](./apps/api/README.md) · [`apps/web`](./apps/web/README.md) · [`packages/database`](./packages/database/README.md) |

## Quick start

Prerequisites: **Node.js**, **pnpm**, and **Docker** — exact versions are pinned in [`.tool-versions`](./.tool-versions) and [`.nvmrc`](./.nvmrc) (usable with asdf, mise, or nvm).

```bash
pnpm install
cp .envrc.template .envrc     # fill in, then: direnv allow   (or: source .envrc)

# Start supporting services (Postgres + Keycloak IdP + MinIO object storage)
cd packages/database && docker compose up -d && cd ../..
docker compose -f docker-compose.yml -f compose/keycloak.yaml --env-file .env.dockercompose up -d keycloak keycloak-db
docker compose -f docker-compose.minio.yml up -d

pnpm db:restore               # reset + migrate + seed
pnpm dev                      # API :8080 · Web :5173 · Swagger :8080/api/docs
```

**[`docs/development/local-setup.md`](./docs/development/local-setup.md) is the canonical, step-by-step guide** — follow it for auth options (Keycloak / Azure Entra / `forced-user`), the full environment-variable reference, and troubleshooting.

## Contributing

See [`docs/development/contributing.md`](./docs/development/contributing.md). In brief: Conventional Commits, small and modular commits, and `pnpm format && pnpm lint && pnpm type-check` must pass before every commit.

## License

MIT — UNDP Huella Latam Team.
