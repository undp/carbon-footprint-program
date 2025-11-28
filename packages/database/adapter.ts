import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./environment.js";

export const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});
