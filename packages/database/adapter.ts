import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./environment.js";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

export const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});
