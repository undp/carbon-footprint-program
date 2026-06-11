import { defineConfig } from "prisma/config";
import { DATABASE_URL } from "./src/environment.js";

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
