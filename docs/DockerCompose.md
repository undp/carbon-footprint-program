# Docker Setup for Huella Latam

> **Deprecated.** This document has been superseded. The canonical, maintained Docker Compose guide now lives at [`operations/docker-compose.md`](./operations/docker-compose.md) — covering services, boot order, environment configuration, auth + storage setup, and troubleshooting.

The canonical guide uses the `.env.dockercompose` env file, created from the committed example:

```bash
cp .env.dockercompose.example .env.dockercompose
```

The old `docker-compose.env` file referenced by earlier versions of this page is legacy (gitignored) and no longer used.
