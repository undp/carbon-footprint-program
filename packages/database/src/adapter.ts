import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./environment.js";

export const generatePrismaAdapter = (
  connectionString: string = DATABASE_URL
) => {
  if (!connectionString)
    throw new Error(
      "Prisma adapter requires a non-empty database connection string"
    );

  return new PrismaPg({
    connectionString,
  });
};

