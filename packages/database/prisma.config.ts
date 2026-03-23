import { defineConfig } from "prisma/config";
import { DATABASE_URL } from "./src/environment.js";

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
    seed: "tsx src/prisma/seeds/seed.ts",
  },
  datasource: {
    // Fallback allows `prisma generate` (client codegen) to run without a live DB.
    // Actual connections require DATABASE_URL to be set at runtime.
    url: DATABASE_URL || "postgresql://localhost:5432/placeholder",
  },
});
