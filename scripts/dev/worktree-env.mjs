#!/usr/bin/env node
// OPT-IN git-worktree isolation. Prints shell statements to `eval` from .envrc so
// THIS worktree runs its API + database on its own values, letting several
// worktrees run side by side without colliding. Nothing here runs unless you
// uncomment the `eval "$(node scripts/dev/worktree-env.mjs)"` line in .envrc — a
// normal single checkout is unaffected and uses the defaults (API 8080, web 5173).
//
// It emits:
//   • API_HOST / API_PORT / API_ORIGIN  — a per-worktree API port, assigned once
//       from a registry shared by all worktrees (a file in the repo's common .git
//       dir): dense, unique, ZERO collision, and stable across direnv reloads
//       because it's read back, not recomputed. Ports of deleted worktrees are
//       reclaimed automatically.
//   • VITE_API_BASE_URL                  — the ambient URL, repointed at that port.
//   • DATABASE_URL                       — a per-worktree db name (localhost only).
//   • unset VITE_OIDC_*_REDIRECT_URI     — so login follows the real web origin.
//
// The WEB port is intentionally NOT managed here: Vite already binds the next
// free port itself (collision-free, self-healing), and the dev Keycloak realm
// accepts any localhost redirect URI.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const API_HOST = "127.0.0.1";
const PORT_RANGE_START = 8100; // clear of 8080/8081/9000/5432/5173+
const PORT_RANGE_END = 8999;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

let root, commonDir;
try {
  root = git(["rev-parse", "--show-toplevel"]);
  // Absolute path to the shared .git dir — the same for every worktree of this
  // repo, so the registry below is visible to all of them.
  commonDir = resolve(process.cwd(), git(["rev-parse", "--git-common-dir"]));
} catch {
  process.exit(0); // not a git checkout — leave the environment untouched
}

const out = []; // shell statements eval'd by .envrc (stdout — nothing else here)
const notes = []; // human-readable summary shown to the user (stderr)
const shExport = (name, value) =>
  out.push(`export ${name}='${String(value).replace(/'/g, `'\\''`)}'`);

// --- API port: assigned once from the shared registry, then reused forever ---
const { port: apiPort, isNew: isNewWorktree } = assignApiPort();
shExport("API_HOST", API_HOST);
shExport("API_PORT", apiPort);
shExport("API_ORIGIN", `http://${API_HOST}:${apiPort}`);
notes.push(`API      http://${API_HOST}:${apiPort}`);

// --- VITE_API_BASE_URL: repoint the ambient URL's host + port, keep the path ---
let apiBaseUrl = `http://${API_HOST}:${apiPort}/api`;
if (process.env.VITE_API_BASE_URL) {
  try {
    const u = new URL(process.env.VITE_API_BASE_URL);
    u.hostname = API_HOST;
    u.port = String(apiPort);
    apiBaseUrl = u.toString().replace(/\/$/, "");
  } catch {
    // unparseable — keep the fallback above
  }
}
shExport("VITE_API_BASE_URL", apiBaseUrl);

// --- DATABASE_URL: per-worktree db name (localhost only, idempotent) ---
if (process.env.DATABASE_URL) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    const dbName = u.pathname.replace(/^\//, "");
    const suffix = `_${createHash("sha1").update(root).digest("hex").slice(0, 8)}`;
    if (LOCAL_HOSTS.has(u.hostname) && dbName && !dbName.endsWith(suffix)) {
      u.pathname = `/${dbName}${suffix}`;
      shExport("DATABASE_URL", u.toString());
      notes.push(`Database ${dbName}${suffix}`); // name only — never the password
    }
  } catch {
    // unparseable — leave DATABASE_URL as-is
  }
}

// --- OIDC: follow the actual serving origin instead of a pinned :5173 ---
// apps/web/src/config/environment.ts falls back to window.location.origin when
// these are empty, so login follows whatever port Vite serves — but the IdP must
// accept that port. The dev Keycloak realm allows any localhost redirect URI;
// Entra's SPA registration needs each dev port registered (no wildcard), so prefer
// Keycloak for worktree dev. See docs/development/worktree-isolation.md.
out.push("unset VITE_OIDC_REDIRECT_URI VITE_OIDC_POST_LOGOUT_REDIRECT_URI");
notes.push("OIDC     redirect follows the web origin (Vite's actual port)");

// One-time nudge on a brand-new worktree (first direnv load only). Provisioning
// stays manual — this only reminds; it never touches the database itself.
if (isNewWorktree) {
  notes.push(
    "new worktree → run 'pnpm db:provision' once to set up its database"
  );
}

// stdout: only the export/unset lines — that's what `.envrc` eval's. The summary
// goes to stderr so direnv surfaces it in the terminal on every load, without
// polluting the eval. (No secrets: the DB password is never printed.)
process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  [
    "worktree-env: git-worktree isolation active",
    ...notes.map((n) => `  ${n}`),
  ].join("\n") + "\n"
);

// ---------------------------------------------------------------------------

// Assigns this worktree the lowest free API port and persists it in a registry
// shared by every worktree (a JSON file in the common .git dir). Because the
// assignment considers all other worktrees' ports, it is unique — zero collision
// — and, once written, it is read back on every reload (never recomputed), so the
// port is stable. Entries for worktrees whose directory no longer exists are
// pruned, reclaiming their ports.
function assignApiPort() {
  const registry = join(commonDir, "huella-dev-worktree-ports.json");
  const lock = join(commonDir, "huella-dev-worktree-ports.lock");

  // Fast path: already assigned → reuse it (no lock, no scan).
  const existing = readRegistry(registry)[root];
  if (isValidPort(existing)) return { port: existing, isNew: false };

  // First assignment: take the lock so two brand-new worktrees loading .envrc at
  // the same instant can't grab the same slot.
  const locked = acquireLock(lock);
  try {
    const reg = prune(readRegistry(registry));
    if (isValidPort(reg[root])) return { port: reg[root], isNew: false };
    const taken = new Set(Object.values(reg));
    let port = PORT_RANGE_START;
    while (port <= PORT_RANGE_END && taken.has(port)) port++;
    // >900 live worktrees would exhaust the range; wrap rather than emit junk.
    if (port > PORT_RANGE_END) port = PORT_RANGE_START;
    reg[root] = port;
    writeRegistryAtomic(registry, reg);
    return { port, isNew: true };
  } finally {
    if (locked) {
      try {
        rmdirSync(lock);
      } catch {
        // already gone — fine
      }
    }
  }
}

function isValidPort(p) {
  return Number.isInteger(p) && p >= PORT_RANGE_START && p <= PORT_RANGE_END;
}

function readRegistry(file) {
  if (!existsSync(file)) return {};
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {}; // corrupt/partial — start fresh rather than crash direnv
  }
}

// Drop entries whose worktree directory no longer exists, freeing their ports.
function prune(reg) {
  const kept = {};
  for (const [path, port] of Object.entries(reg)) {
    if (existsSync(path)) kept[path] = port;
  }
  return kept;
}

function writeRegistryAtomic(file, reg) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(reg, null, 2) + "\n");
  renameSync(tmp, file); // atomic replace on the same filesystem
}

// Simple advisory lock via atomic mkdir, with stale-lock stealing so a crashed
// holder can't wedge direnv. Best-effort: on give-up we proceed anyway (the
// registry write is still atomic, and real contention here is near-impossible).
function acquireLock(lock) {
  const STALE_MS = 10_000;
  for (let i = 0; i < 40; i++) {
    try {
      mkdirSync(lock); // fails with EEXIST if another holder exists
      return true;
    } catch (err) {
      if (err.code !== "EEXIST") return false;
      try {
        if (Date.now() - statSync(lock).mtimeMs > STALE_MS) {
          rmdirSync(lock); // steal a stale lock (crashed holder)
          continue;
        }
      } catch {
        // lock vanished between calls — just retry
      }
      sleepSync(25);
    }
  }
  return false;
}

// Synchronous sleep so this stays a plain top-to-bottom script.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
