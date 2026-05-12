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
import { CorpusSourceStatus } from "@repo/database/enums";

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
});
