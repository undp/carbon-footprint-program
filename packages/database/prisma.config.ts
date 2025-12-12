import { defineConfig } from "prisma/config";
import { DATABASE_URL } from "./environment.js";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seeds/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
