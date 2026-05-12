// Fixture path: apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf
// — ~5pp GHG Protocol Corporate Standard fair-use excerpt (Spanish
// translation by WRI/WBCSD, 2006). Contains chapter heading, scope
// 1/2/3 subheadings, and definition paragraphs.

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../..");
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  "apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf"
);
// Wrap an arg in double quotes for both /bin/sh and cmd.exe. Both
// interpret `"..."` as a single token, so args with spaces (the label,
// the fixture path on Windows under `OneDrive\Documentos`) survive
// the shell tokenization step.
const quote = (s: string): string => `"${s.replace(/"/g, '\\"')}"`;

describe("ingest CLI — integration", () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(() => {
    databaseUrl = inject("databaseUrl");
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(databaseUrl),
    });
  });

  afterAll(async () => {
    // Audit row references source via SetNull on delete, so it survives
    // a source deleteMany. Wipe it explicitly.
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

  // Maps to the chatbot-corpus-ingest CRITICAL release-gate invariant:
  // "Ingest CLI computes embeddings and inserts source plus chunks
  // atomically". A regression that leaves orphan rows or skips the
  // embedding step would break the citation flow without surfacing
  // until a user query missed a chunk that was supposed to be there.
  it(
    "happy path with valid PDF",
    async () => {
      // Use a quoted command string + execSync (shell on by default) so
      // the same call works on Windows (cmd.exe finds `pnpm.cmd`) and
      // POSIX shells. execFileSync with args array fails on Windows for
      // two reasons: Node 18.20+ blocks direct `.cmd` spawn (CVE-2024-27980),
      // and `shell: true` re-tokenizes args splitting "GHG Protocol Test"
      // into three. Manual quoting sidesteps both.
      const command = [
        "pnpm",
        "--filter=api",
        "chatbot:ingest",
        quote(FIXTURE_PATH),
        "--label",
        quote("GHG Protocol Test"),
        "--version",
        "v01",
        "--source-type",
        "PDF",
        "--scope",
        "GLOBAL",
        "--cite-url",
        "https://ghgprotocol.org/corporate-standard",
      ].join(" ");

      // Forwarding `process.env` keeps USERNAME / USER available so the
      // CLI's triggered_by fallback (`cli:<os-user>`) resolves to a real
      // identity on Windows / macOS / Linux without per-platform branching.
      // DATABASE_URL is overridden to point at the testcontainer.
      execSync(command, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          EMBEDDING_PROVIDER: "mock",
        },
      });

      // (a) exactly one chatbot_corpus_source row, status = DRAFT.
      const sources = await prisma.chatbotCorpusSource.findMany();
      expect(sources).toHaveLength(1);
      const source = sources[0];
      expect(source.status).toBe(CorpusSourceStatus.DRAFT);
      expect(source.name).toBe("GHG Protocol Test");
      expect(source.version).toBe("v01");

      // (b) one or more chatbot_corpus_chunk rows linked to it, each with
      // a non-NULL 1024-dimensional embedding. The Unsupported("vector")
      // column is not selectable via the typed client, so the dimension
      // check goes through raw SQL using pgvector's `vector_dims`.
      const chunkDimRows = await prisma.$queryRaw<
        Array<{ chunk_id: bigint; dims: number | null }>
      >`
        SELECT id AS chunk_id, vector_dims(embedding) AS dims
        FROM chatbot_corpus_chunk
        WHERE source_id = ${source.id}
        ORDER BY chunk_index ASC
      `;
      expect(chunkDimRows.length).toBeGreaterThanOrEqual(1);
      for (const row of chunkDimRows) {
        // `dims` is NULL if the embedding column is NULL. Both branches
        // (NULL embedding OR wrong-dimension embedding) are regressions
        // the schema's `vector(1024)` declaration intends to catch.
        expect(row.dims).toBe(1024);
      }

      // (c) exactly one ingest audit row with completed_at populated and
      // chunks_created matching the actual count.
      const audits = await prisma.chatbotCorpusIngestRun.findMany();
      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit.completedAt).not.toBeNull();
      expect(audit.sourceId).toBe(source.id);
      expect(audit.chunksCreated).toBe(chunkDimRows.length);
      expect(audit.embeddingModel).toBe("mock-sha256-1024");
    },
    60_000
  );

  // Maps to chatbot-corpus-ingest spec scenario "Re-ingest with new version
  // creates a new DRAFT alongside the existing ACTIVE row" (Decision 11 in
  // design.md): only collision on (name, version, status=DRAFT) is fatal;
  // a different version, even when an earlier version is ACTIVE, opens a
  // fresh DRAFT.
  //
  // Strategy: seed an ACTIVE v05 directly via Prisma (no embeddings —
  // unrelated to the assertion), then invoke the CLI with `--version v06`.
  // The CLI's pre-flight DRAFT-collision probe finds no DRAFT with
  // (name="GHG Protocol Test", version="v06"), proceeds through embedding
  // and insert, and produces the new DRAFT row. The seeded ACTIVE row is
  // untouched.
  it(
    "re-ingest with new version creates new DRAFT alongside existing ACTIVE",
    async () => {
      const NAME = "GHG Protocol Test";
      const seeded = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v05",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(),
          citeLabel: NAME,
          citeUrl: "https://ghgprotocol.org/corporate-standard",
        },
      });

      const command = [
        "pnpm",
        "--filter=api",
        "chatbot:ingest",
        quote(FIXTURE_PATH),
        "--label",
        quote(NAME),
        "--version",
        "v06",
        "--source-type",
        "PDF",
        "--scope",
        "GLOBAL",
        "--cite-url",
        "https://ghgprotocol.org/corporate-standard",
      ].join(" ");

      execSync(command, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          EMBEDDING_PROVIDER: "mock",
        },
      });

      // Two rows: the seeded ACTIVE v05 and the newly-ingested DRAFT v06.
      const sources = await prisma.chatbotCorpusSource.findMany({
        where: { name: NAME },
        orderBy: { id: "asc" },
      });
      expect(sources).toHaveLength(2);

      const v05 = sources.find((s) => s.version === "v05");
      const v06 = sources.find((s) => s.version === "v06");
      expect(v05).toBeDefined();
      expect(v06).toBeDefined();
      // Seeded row preserved verbatim — id unchanged, status still ACTIVE.
      // The ingest path SHALL NOT mutate sibling versions; only activate
      // does that (and only under the advisory lock).
      expect(v05!.id).toBe(seeded.id);
      expect(v05!.status).toBe(CorpusSourceStatus.ACTIVE);
      expect(v06!.status).toBe(CorpusSourceStatus.DRAFT);

      // Chunks attach only to the new v06; the seeded ACTIVE has no
      // chunks (we never inserted any for v05).
      const v05Chunks = await prisma.chatbotCorpusChunk.count({
        where: { sourceId: v05!.id },
      });
      const v06Chunks = await prisma.chatbotCorpusChunk.count({
        where: { sourceId: v06!.id },
      });
      expect(v05Chunks).toBe(0);
      expect(v06Chunks).toBeGreaterThanOrEqual(1);
    },
    60_000
  );

  // Maps to chatbot-corpus-ingest spec "Re-ingest fail-fast on (name,
  // version, status=DRAFT) collision" (Decision 11 in design.md): a
  // re-ingest that would create a duplicate DRAFT must exit non-zero with
  // a Spanish error naming the offending source id, and SHALL NOT touch
  // the database (no new source row, no new chunks, no audit row — the
  // collision check is the pre-flight gate that runs before the audit row
  // is created).
  it(
    "re-ingest collision on existing DRAFT fails fast with non-zero exit and Spanish error",
    async () => {
      const NAME = "GHG Protocol Test";
      const seeded = await prisma.chatbotCorpusSource.create({
        data: {
          name: NAME,
          version: "v05",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.DRAFT,
          citeLabel: NAME,
          citeUrl: "https://ghgprotocol.org/corporate-standard",
        },
      });

      const command = [
        "pnpm",
        "--filter=api",
        "chatbot:ingest",
        quote(FIXTURE_PATH),
        "--label",
        quote(NAME),
        "--version",
        "v05",
        "--source-type",
        "PDF",
        "--scope",
        "GLOBAL",
        "--cite-url",
        "https://ghgprotocol.org/corporate-standard",
      ].join(" ");

      // execSync throws on non-zero exit; capture status + stderr off the
      // thrown error object. ESLint forbids `any` so we narrow via a
      // typed shape that matches Node's ChildProcessError surface.
      let exitCode = 0;
      let stderr = "";
      try {
        execSync(command, {
          cwd: REPO_ROOT,
          encoding: "utf8",
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            EMBEDDING_PROVIDER: "mock",
          },
        });
      } catch (err) {
        const e = err as { status: number; stderr: string };
        exitCode = e.status;
        stderr = e.stderr;
      }

      // Spec: exit non-zero. The CLI returns 3 on collision; assert
      // non-zero rather than pin the specific code so a future re-numbering
      // (e.g., consolidating return codes) doesn't break this guard.
      expect(exitCode).not.toBe(0);
      // Spec: Spanish error message naming the offending source id.
      expect(stderr).toContain("DRAFT");
      expect(stderr).toContain(seeded.id.toString());
      // The literal opener varies between the pre-flight and intra-tx
      // branches ("Ya existe..." vs "Otra ingesta concurrente..."), so
      // assert the more stable surface — the source id appears
      // byte-for-byte in both.

      // Spec: no new rows inserted. The seeded row is the only source;
      // no chunks were created; the audit row was NOT created because the
      // collision check runs BEFORE the audit-row insert in the CLI flow
      // (see scripts/chatbot/ingestCorpus.ts:146-159 → audit insert at
      // line 162).
      const sources = await prisma.chatbotCorpusSource.findMany({
        where: { name: NAME },
      });
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe(seeded.id);

      const chunks = await prisma.chatbotCorpusChunk.count();
      expect(chunks).toBe(0);

      const audits = await prisma.chatbotCorpusIngestRun.count();
      expect(audits).toBe(0);
    },
    60_000
  );

  // Maps to chatbot-corpus-ingest spec scenario "Audit row persists on
  // failure with NULL completed_at":
  //   the CLI inserts the audit row up-front so a failure leaves a
  //   visible trace; on embedding failure the audit row remains with
  //   completed_at = NULL and source_id = NULL, and no
  //   chatbot_corpus_source row is created for the attempt.
  //
  // The CLI runs in a subprocess via execSync (no in-process vi.spyOn
  // reach), so the mock embedding provider's `embed` method is forced
  // to throw via the __TEST_FORCE_EMBEDDING_FAILURE env var passed
  // across the process boundary. The mock requires NODE_ENV=test as a
  // second-layer guard against accidental env-var sets in staging
  // (defense in depth; the mock is already test-only via the boot
  // guard that rejects EMBEDDING_PROVIDER=mock when NODE_ENV=production).
  // See apps/api/src/features/chatbot/embeddingProvider/mock.ts for
  // the mechanism's full comment.
  it(
    "audit row persists on embedding failure with NULL completed_at and NULL source_id",
    async () => {
      const NAME = "GHG Protocol Test";
      const command = [
        "pnpm",
        "--filter=api",
        "chatbot:ingest",
        quote(FIXTURE_PATH),
        "--label",
        quote(NAME),
        "--version",
        "v07",
        "--source-type",
        "PDF",
        "--scope",
        "GLOBAL",
        "--cite-url",
        "https://ghgprotocol.org/corporate-standard",
      ].join(" ");

      let exitCode = 0;
      try {
        execSync(command, {
          cwd: REPO_ROOT,
          encoding: "utf8",
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            EMBEDDING_PROVIDER: "mock",
            NODE_ENV: "test",
            __TEST_FORCE_EMBEDDING_FAILURE: "true",
          },
        });
      } catch (err) {
        const e = err as { status: number };
        exitCode = e.status;
      }

      // CLI's outer catch returns 1 on a generic Error from embed().
      // Assert non-zero rather than pinning the specific code so a
      // future re-numbering of return codes doesn't break this guard.
      expect(exitCode).not.toBe(0);

      // Spec: no source row was created. The CLI's flow runs embed()
      // BEFORE the source-and-chunks $transaction, so the throw leaves
      // zero source rows.
      const sources = await prisma.chatbotCorpusSource.findMany();
      expect(sources).toHaveLength(0);

      // Spec: exactly one audit row exists with NULL completed_at AND
      // NULL source_id. The CLI inserts the audit row UP-FRONT (before
      // parsePdf/chunkText/embed) with sourceId=null; embedding failure
      // skips the audit-row UPDATE that would have populated
      // completed_at and source_id on success.
      const audits = await prisma.chatbotCorpusIngestRun.findMany();
      expect(audits).toHaveLength(1);
      expect(audits[0].completedAt).toBeNull();
      expect(audits[0].sourceId).toBeNull();
    },
    60_000
  );
});
