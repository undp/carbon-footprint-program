/**
 * Drops THIS git worktree's private local database — the one created when
 * worktree isolation is enabled in .envrc (see scripts/dev/worktree-env.mjs).
 *
 * Usage:
 *   pnpm db:drop:worktree
 *
 * Run this when you remove a worktree, so per-worktree databases don't pile up.
 *
 * Safety: it refuses unless the target database lives on localhost AND its name
 * carries the per-worktree "_<hash>" suffix — so it can never drop the shared
 * base database or anything on a remote/cloud server. It only ever acts on the
 * database that DATABASE_URL currently points at (this worktree's own).
 */
import { generatePrismaAdapter, PrismaClient } from "../index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const dbName = url.pathname.replace(/^\//, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// A per-worktree database is a localhost DB whose name ends in the 8-hex suffix
// added by scripts/dev/worktree-env.mjs (e.g. huella_latam_1a2b3c4d). This guard
// refuses the shared base database (no such suffix) and anything remote/cloud.
const isPerWorktree = /_[0-9a-f]{8}$/.test(dbName);
if (!LOCAL_HOSTS.has(url.hostname) || !isPerWorktree) {
  console.error(
    `Refusing to drop "${dbName}": it is not a per-worktree local database ` +
      `(expected a localhost database whose name ends in a "_<hash>" suffix from ` +
      `scripts/dev/worktree-env.mjs). Is worktree isolation enabled in .envrc?`
  );
  process.exit(1);
}

// Connect to the maintenance database — you cannot DROP a database you're in.
const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";
const admin = new PrismaClient({
  adapter: generatePrismaAdapter(adminUrl.toString()),
});

try {
  await admin.$executeRawUnsafe(
    `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`
  );
  console.log(`Dropped database "${dbName}".`);
} finally {
  await admin.$disconnect();
}
