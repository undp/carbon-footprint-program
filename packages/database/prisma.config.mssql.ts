import { defineConfig } from "prisma/config";
import { DATABASE_URL } from "./src/environment.js";

// NOTE: the SQL Server schema and migrations are introduced in PR 4
// (feat/mati/sqlserver-schema-and-views). Until then, commands run with this
// config will fail because src/prisma/sqlserver/schema.prisma does not exist
// yet. The config is added now so the dual-provider scaffolding is complete.
export default defineConfig({
  schema: "src/prisma/sqlserver/schema.prisma",
  migrations: {
    path: "src/prisma/sqlserver/migrations",
    seed: "tsx src/prisma/seeds/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
