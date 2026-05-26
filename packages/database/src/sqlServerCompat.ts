import { DB_PROVIDER, DbProvider } from "./environment.js";

/**
 * SQL Server compatibility layer applied as a Prisma Client extension.
 *
 * The SQL Server connector differs from PostgreSQL in two ways that would
 * otherwise force changes across every seed and service:
 *
 *  1. `createMany({ skipDuplicates: true })` is not supported on SQL Server.
 *     Seeds run against a fresh database, so skipping duplicates is a no-op
 *     safety net — we simply drop the flag on SQL Server.
 *
 *  2. The `Json` scalar type is not supported on SQL Server (design.md finding
 *     10), so the JSON columns are declared `String @db.NVarChar(Max)` in the
 *     SQL Server schema. This extension transparently `JSON.stringify`s those
 *     fields on write and `JSON.parse`s them on read, so application/seed code
 *     keeps passing and receiving plain objects/arrays exactly like on Postgres.
 *
 * On PostgreSQL the extension is a no-op (the function returns the client
 * unchanged), so callers can apply it unconditionally.
 */

// Prisma model name -> JSON-typed field names (camelCase, as used in client args/results).
const JSON_FIELDS: Record<string, readonly string[]> = {
  EmissionFactor: ["gasDetails"],
  CarbonInventory: ["organizationData"],
  CarbonInventoryLineFactor: ["derivationDetails"],
  CarbonInventoryLineResult: ["resultDetails"],
  SystemParameter: ["options"],
  ReductionProject: ["consideredGei"],
};

function stringifyJsonFields(
  model: string | undefined,
  data: unknown
): unknown {
  if (!model) return data;
  const fields = JSON_FIELDS[model];
  if (!fields || data == null || typeof data !== "object") return data;

  const applyOne = (row: Record<string, unknown>): Record<string, unknown> => {
    const copy = { ...row };
    for (const field of fields) {
      const value = copy[field];
      if (value != null && typeof value !== "string") {
        copy[field] = JSON.stringify(value);
      }
    }
    return copy;
  };

  if (Array.isArray(data)) {
    return (data as unknown[]).map((row) =>
      row && typeof row === "object"
        ? applyOne(row as Record<string, unknown>)
        : row
    );
  }
  return applyOne(data as Record<string, unknown>);
}

function parseJsonFields(model: string | undefined, result: unknown): unknown {
  if (!model) return result;
  const fields = JSON_FIELDS[model];
  if (!fields || result == null || typeof result !== "object") return result;

  const applyOne = (row: Record<string, unknown>): Record<string, unknown> => {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === "string") {
        try {
          row[field] = JSON.parse(value);
        } catch {
          // leave the raw string if it is not valid JSON
        }
      }
    }
    return row;
  };

  if (Array.isArray(result)) {
    return (result as unknown[]).map((row) =>
      row && typeof row === "object"
        ? applyOne(row as Record<string, unknown>)
        : row
    );
  }
  return applyOne(result as Record<string, unknown>);
}

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
]);

/**
 * Wraps a PrismaClient with the SQL Server compatibility extension when
 * `DB_PROVIDER=sqlserver`; otherwise returns the client unchanged.
 */
export function applySqlServerCompat<T extends object>(client: T): T {
  if (DB_PROVIDER !== DbProvider.SQLSERVER) return client;

  return (
    client as unknown as {
      $extends: (ext: unknown) => T;
    }
  ).$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model?: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: unknown) => Promise<unknown>;
        }) {
          if (args && typeof args === "object") {
            if (
              (operation === "createMany" ||
                operation === "createManyAndReturn") &&
              "skipDuplicates" in args
            ) {
              delete args.skipDuplicates;
            }
            if (WRITE_OPERATIONS.has(operation)) {
              if ("data" in args)
                args.data = stringifyJsonFields(model, args.data);
              if ("create" in args)
                args.create = stringifyJsonFields(model, args.create);
              if ("update" in args)
                args.update = stringifyJsonFields(model, args.update);
            }
          }
          const result = await query(args);
          return parseJsonFields(model, result);
        },
      },
    },
  });
}
