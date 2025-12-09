import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./environment.js";

export const generatePrismaAdapter = (
  connectionString: string = DATABASE_URL
) =>
  new PrismaPg({
    connectionString,
  });
