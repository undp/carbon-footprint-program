import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable was not found");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: DATABASE_URL,
  },
});
