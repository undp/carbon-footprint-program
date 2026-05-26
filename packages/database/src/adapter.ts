import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { DATABASE_URL, DB_PROVIDER, DbProvider } from "./environment.js";

export const generatePrismaAdapter = (
  connectionString: string = DATABASE_URL
) => {
  if (!connectionString)
    throw new Error(
      "Prisma adapter requires a non-empty database connection string"
    );

  // The SQL Server adapter accepts the JDBC-style connection string directly
  // (e.g. "sqlserver://host:1433;database=...;user=...;password=...;encrypt=true"),
  // which differs from the "postgresql://..." URL used by the pg adapter.
  if (DB_PROVIDER === DbProvider.SQLSERVER) {
    return new PrismaMssql(connectionString);
  }

  return new PrismaPg({ connectionString });
};
