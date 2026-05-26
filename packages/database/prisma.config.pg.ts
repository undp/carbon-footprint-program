import { defineConfig } from "prisma/config";
import { DATABASE_URL } from "./src/environment.js";

export default defineConfig({
  schema: "src/prisma/postgresql/schema.prisma",
  migrations: {
    path: "src/prisma/postgresql/migrations",
    seed: "tsx src/prisma/seeds/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
