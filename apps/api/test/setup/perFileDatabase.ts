import { createHash } from "node:crypto";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import { afterAll, beforeAll, expect, inject } from "vitest";

/**
 * Per-file database isolation (PROTOTYPE).
 *
 * Every test file gets its OWN database, cloned from the already-migrated-and-
 * seeded template (`testdb`, prepared once in globalSetup) via
 * `CREATE DATABASE ... TEMPLATE testdb`. That copy is a fast, file-level
 * Postgres operation — no per-file migrate/seed. Because each file starts from
 * pristine seeded state, tests no longer have to clean up their own rows, and a
 * leftover row in one file can never break the next. It is also inherently
 * parallel-safe, which is what lets vitest run files across workers
 * (fileParallelism: true, maxWorkers > 1).
 *
 * The created database is NOT dropped: the Postgres testcontainer is ephemeral
 * and dies with the suite, so there is nothing to clean up across runs. (We
 * only need connection hygiene — each test still closes its own app/pool.)
 */

let perFileDatabaseUrl: string | undefined;

/** URL of the current test file's private database, or undefined before setup. */
export function getPerFileDatabaseUrl(): string | undefined {
  return perFileDatabaseUrl;
}

function isDuplicateDatabaseError(error: unknown): boolean {
  // Postgres 42P04 = duplicate_database. Prisma surfaces the pg message in the
  // raw-query error, so match defensively on both the code and the text.
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message) || /42P04/.test(message);
}

function isTemplateInUseError(error: unknown): boolean {
  // 55006 = object_in_use: another concurrent clone briefly locked the template.
  const message = error instanceof Error ? error.message : String(error);
  return /being accessed by other users/i.test(message) || /55006/.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async (context) => {
  const templateUrl = inject("databaseUrl");
  const template = new URL(templateUrl);
  const templateDatabase = template.pathname.replace(/^\//, "") || "testdb";

  // A short, unique, valid identifier per file. Hash the FULL test path (not the
  // basename — ~130 files are all named `integration.test.ts`). 16 hex chars of
  // sha256 make a collision effectively impossible; the create-with-suffix loop
  // below makes even that self-healing. Prefer the file path from the hook's
  // suite context, falling back to the matcher state.
  const suite = context as {
    file?: { filepath?: string };
    filepath?: string;
  };
  const testPath =
    suite.file?.filepath ??
    suite.filepath ??
    expect.getState().testPath ??
    `unknown-${Date.now()}`;
  const base = `t_${createHash("sha256").update(testPath).digest("hex").slice(0, 16)}`;

  // Admin connection targets the always-present `postgres` maintenance database,
  // NOT the template — `CREATE DATABASE ... TEMPLATE testdb` requires that no
  // session is connected to `testdb`.
  const adminUrl = new URL(templateUrl);
  adminUrl.pathname = "/postgres";
  const admin = new PrismaClient({
    adapter: generatePrismaAdapter(adminUrl.toString()),
  });

  try {
    let name = base;
    let suffix = 1;
    for (;;) {
      try {
        await admin.$executeRawUnsafe(
          `CREATE DATABASE "${name}" TEMPLATE "${templateDatabase}"`
        );
        break;
      } catch (error) {
        if (isDuplicateDatabaseError(error)) {
          // Name already used (hash collision, or a re-run without a fresh
          // container): take the next suffix and get our own fresh database.
          suffix += 1;
          name = `${base}_${suffix}`;
          continue;
        }
        if (isTemplateInUseError(error)) {
          // A concurrent clone momentarily held the template; back off and retry.
          await sleep(100);
          continue;
        }
        throw error;
      }
    }

    const fileUrl = new URL(templateUrl);
    fileUrl.pathname = `/${name}`;
    perFileDatabaseUrl = fileUrl.toString();
  } finally {
    await admin.$disconnect();
  }
});

afterAll(() => {
  // Intentionally NOT dropping the database (ephemeral container). Just clear the
  // reference so nothing accidentally reuses it after the file finishes.
  perFileDatabaseUrl = undefined;
});
