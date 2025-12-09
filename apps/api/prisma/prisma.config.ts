import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  datasource: {
    url: DATABASE_URL,
  },
});
