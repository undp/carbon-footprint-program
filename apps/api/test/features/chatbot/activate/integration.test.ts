import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";

// Concurrent activates (10.9) use promisified exec so two subprocesses
// can fire in parallel via Promise.allSettled — execSync would
// serialize them in the parent and not exercise the race.
const execAsync = promisify(exec);

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../..");

const activateCommand = (id: bigint): string =>
  ["pnpm", "--filter=api", "chatbot:activate", id.toString()].join(" ");

describe("activate CLI — integration", () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(() => {
    databaseUrl = inject("databaseUrl");
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma.chatbotCorpusIngestRun.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.chatbotCorpusIngestRun.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
  });

  // Maps to chatbot-corpus-ingest spec scenario "Activate CLI flips
  // state atomically under an identity-scoped advisory lock"
  // (design.md Decision 12):
  //   the prior ACTIVE source for the same (name, scope) becomes
  //   OUTDATED with deactivated_at set, AND the target DRAFT becomes
  //   ACTIVE with activated_at set, both updates sharing the same
  //   timestamp (single-instant cutover semantics).
  //
  // The shared-timestamp invariant is asserted byte-for-byte on the
  // millisecond getTime() values — a regression that calls `new Date()`
  // twice (once per UPDATE) would leak a few-millisecond drift that
  // confuses analytics and downstream history queries.
  it(
    "flips OUTDATED on previous + ACTIVE on new in single transaction with shared timestamp",
    async () => {
      const NAME = "GHG Protocol Test";
      const oldActive = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v05",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(Date.now() - 60 * 60 * 1000),
          citeLabel: NAME,
          citeUrl: "https://example.com/v05",
        },
      });
      const newDraft = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v06",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.DRAFT,
          citeLabel: NAME,
          citeUrl: "https://example.com/v06",
        },
      });

      execSync(activateCommand(newDraft.id), {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      const updated = await prisma.chatbotCorpusSource.findMany({
        where: { name: NAME },
        orderBy: { id: "asc" },
      });
      expect(updated).toHaveLength(2);

      const v05 = updated.find((s) => s.id === oldActive.id);
      const v06 = updated.find((s) => s.id === newDraft.id);
      expect(v05).toBeDefined();
      expect(v06).toBeDefined();

      // Prior ACTIVE → OUTDATED with deactivated_at populated.
      expect(v05!.status).toBe(CorpusSourceStatus.OUTDATED);
      expect(v05!.deactivatedAt).not.toBeNull();

      // Target DRAFT → ACTIVE with activated_at populated.
      expect(v06!.status).toBe(CorpusSourceStatus.ACTIVE);
      expect(v06!.activatedAt).not.toBeNull();

      // Shared-instant cutover: the deactivated_at of the prior ACTIVE
      // SHALL be byte-for-byte equal to the activated_at of the new
      // ACTIVE. The CLI captures one `new Date()` and threads it
      // through both UPDATEs inside the same $transaction so the
      // history reflects activation as one atomic instant.
      expect(v05!.deactivatedAt!.getTime()).toBe(
        v06!.activatedAt!.getTime()
      );
    },
    60_000
  );

  // Maps to chatbot-corpus-ingest spec scenario "Activate is atomic
  // under an identity-scoped advisory lock":
  //   two concurrent activates targeting different DRAFTs of the same
  //   (name, scope) SHALL serialize on the advisory lock keyed on
  //   `chatbot-corpus:<name>:<scope>`, and after both settle exactly
  //   one row for that (name, scope) is ACTIVE.
  //
  // Without the lock, both transactions would see "0 ACTIVE rows" in
  // their respective updateMany predicates and both would flip their
  // DRAFT to ACTIVE — leaving two ACTIVE rows in violation of the
  // exactly-one-active invariant. With the lock, the second activate
  // unblocks AFTER the first commits, sees the first's just-committed
  // ACTIVE row via its updateMany predicate, flips that to OUTDATED,
  // and then sets its own DRAFT to ACTIVE. Both succeed; end state has
  // one ACTIVE and one OUTDATED.
  it(
    "advisory lock serializes concurrent activates with same (name, scope)",
    async () => {
      const NAME = "GHG Protocol Test";
      const draftA = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v05",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.DRAFT,
          citeLabel: NAME,
          citeUrl: "https://example.com/v05",
        },
      });
      const draftB = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v06",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.DRAFT,
          citeLabel: NAME,
          citeUrl: "https://example.com/v06",
        },
      });

      // Pre-condition sanity: both DRAFTs share (name, scope) — the
      // exact pair the CLI's lock key (`chatbot-corpus:<name>:<scope>`)
      // collapses into a single advisory-lock bucket. If a future
      // refactor drifts the lock-key composition this assertion remains
      // green but the test stops exercising the race; the assertion
      // itself is the visible reminder of the precondition.
      expect(draftA.name).toBe(draftB.name);
      expect(draftA.scope).toBe(draftB.scope);

      const env = { ...process.env, DATABASE_URL: databaseUrl };
      const results = await Promise.allSettled([
        execAsync(activateCommand(draftA.id), {
          cwd: REPO_ROOT,
          encoding: "utf8",
          env,
        }),
        execAsync(activateCommand(draftB.id), {
          cwd: REPO_ROOT,
          encoding: "utf8",
          env,
        }),
      ]);

      // Both invocations resolved (no hang). The advisory lock
      // serializes the transactions; neither subprocess deadlocks.
      expect(results).toHaveLength(2);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(2);

      // Exactly-one-active invariant for the (name, scope) bucket.
      // This is the CRITICAL post-condition the advisory lock protects:
      // a regression that removed the lock would land here with two
      // ACTIVE rows.
      const final = await prisma.chatbotCorpusSource.findMany({
        where: { name: NAME, scope: CorpusSourceScope.GLOBAL },
      });
      expect(final).toHaveLength(2);
      const activeRows = final.filter(
        (s) => s.status === CorpusSourceStatus.ACTIVE
      );
      expect(activeRows).toHaveLength(1);
      const outdatedRows = final.filter(
        (s) => s.status === CorpusSourceStatus.OUTDATED
      );
      expect(outdatedRows).toHaveLength(1);
    },
    60_000
  );

  // Maps to chatbot-corpus-ingest spec scenario "Activate refuses
  // non-DRAFT targets":
  //   activating an OUTDATED (or ACTIVE) source SHALL exit non-zero
  //   with a Spanish error naming the current status, and SHALL NOT
  //   modify any row.
  //
  // Reviving an OUTDATED row without re-ingest would leave stale
  // chunks under an ACTIVE flag — exactly the failure mode the
  // citation rule exists to prevent (design.md Decision 12 rationale).
  it(
    "refuses non-DRAFT target with explicit Spanish error",
    async () => {
      const NAME = "GHG Protocol Test";
      const outdated = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v05",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.OUTDATED,
          activatedAt: new Date(Date.now() - 60 * 60 * 1000),
          deactivatedAt: new Date(),
          citeLabel: NAME,
          citeUrl: "https://example.com/v05",
        },
      });

      let exitCode = 0;
      let stderr = "";
      try {
        execSync(activateCommand(outdated.id), {
          cwd: REPO_ROOT,
          encoding: "utf8",
          env: { ...process.env, DATABASE_URL: databaseUrl },
        });
      } catch (err) {
        const e = err as { status: number; stderr: string };
        exitCode = e.status;
        stderr = e.stderr;
      }

      // CLI returns 3 on CliArgumentError (non-DRAFT). Assert non-zero
      // rather than pin the code so a future re-numbering of return
      // codes doesn't break this guard.
      expect(exitCode).not.toBe(0);
      // Spec: Spanish error message naming the current status and the
      // source id. The CLI's exact phrasing is "La fuente <id> no está
      // en estado DRAFT (estado actual: <status>)." — assert the
      // load-bearing substrings rather than the full literal so a
      // future wording polish (e.g., "no se encuentra en estado") does
      // not break the regression guard.
      expect(stderr).toContain("DRAFT");
      expect(stderr).toContain(CorpusSourceStatus.OUTDATED);
      expect(stderr).toContain(outdated.id.toString());

      // Spec: no row modified. The OUTDATED row stays OUTDATED with its
      // original timestamps.
      const after = await prisma.chatbotCorpusSource.findUnique({
        where: { id: outdated.id },
      });
      expect(after).not.toBeNull();
      expect(after!.status).toBe(CorpusSourceStatus.OUTDATED);
      // activatedAt and deactivatedAt are unchanged — the CLI's
      // CliArgumentError path aborts the transaction before any UPDATE
      // fires.
      expect(after!.activatedAt?.getTime()).toBe(
        outdated.activatedAt?.getTime()
      );
      expect(after!.deactivatedAt?.getTime()).toBe(
        outdated.deactivatedAt?.getTime()
      );
    },
    60_000
  );
});
