import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import { CorpusSourceStatus } from "@repo/database/enums";
import { getPerFileDatabaseUrl } from "@test/setup/perFileDatabase.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../../..");
// Relative to apps/api, the working directory `pnpm --filter=api` gives the
// script — see the ingest integration test for why not an absolute path.
const CORPUS_FIXTURE_REL_PATH = "test/fixtures/chatbot/corpus";
const APP_URL = "https://huella.example.org";

describe("ingest-corpus CLI — integration", () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  const runIngestCorpus = (
    flags: string[],
    envOverrides: Record<string, string> = {}
  ): string =>
    execSync(
      [
        "pnpm",
        "--filter=api",
        "--silent",
        "chatbot:ingest-corpus",
        "--corpus-dir",
        CORPUS_FIXTURE_REL_PATH,
        ...flags,
      ].join(" "),
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          EMBEDDING_PROVIDER: "mock",
          // Keeps the app-URL fallback out of play: only --app-url counts.
          ALLOWED_ORIGIN: "",
          ...envOverrides,
        },
        // The CLI's own failure messages go to stderr; keep them out of the
        // test output.
        stdio: "pipe",
      }
    );

  beforeAll(async () => {
    // Own cloned database: the CLI runs as a subprocess and would otherwise
    // hold connections on the template every other test file clones from.
    databaseUrl = getPerFileDatabaseUrl() ?? inject("databaseUrl");
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(databaseUrl),
    });
    await prisma.chatbotCorpusIngestRun.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
  });

  afterAll(async () => {
    await prisma.chatbotCorpusIngestRun.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
    await prisma.$disconnect();
  });

  // The --check tests run first, against the empty database the ingest test
  // below then fills.
  it("--check validates and shows the plan without writing anything", async () => {
    const output = runIngestCorpus(["--app-url", APP_URL, "--check"]);

    expect(output).toContain("Todo listo para ingerir");
    expect(output).toContain("3 por ingerir");
    expect(await prisma.chatbotCorpusSource.count()).toBe(0);
    expect(await prisma.chatbotCorpusIngestRun.count()).toBe(0);
  }, 120_000);

  it("--check fails when the app URL is missing", async () => {
    expect(() => runIngestCorpus(["--check"])).toThrow(
      /Se necesita una URL https/
    );
    expect(await prisma.chatbotCorpusSource.count()).toBe(0);
  }, 120_000);

  it("--check refuses an EMBEDDING_PROVIDER left to its mock default", () => {
    expect(() =>
      runIngestCorpus(["--app-url", APP_URL, "--check"], {
        EMBEDDING_PROVIDER: "",
      })
    ).toThrow(/EMBEDDING_PROVIDER no está definida/);
  }, 120_000);

  // The API checks these only with CHATBOT_ENABLED=true; the script has to
  // catch them for a corpus seeded before the chatbot is switched on.
  it("--check names every Azure variable azure-openai is missing", () => {
    expect(() =>
      runIngestCorpus(["--app-url", APP_URL, "--check"], {
        EMBEDDING_PROVIDER: "azure-openai",
        CHATBOT_ENABLED: "false",
        AZURE_OPENAI_ENDPOINT: "",
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: "",
      })
    ).toThrow(
      /necesita: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME/
    );
  }, 120_000);

  it("--check rejects an endpoint that is not an https URL", () => {
    expect(() =>
      runIngestCorpus(["--app-url", APP_URL, "--check"], {
        EMBEDDING_PROVIDER: "azure-openai",
        CHATBOT_ENABLED: "false",
        AZURE_OPENAI_ENDPOINT: "oai-dev.openai.azure.com",
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: "embeddings",
      })
    ).toThrow(/AZURE_OPENAI_ENDPOINT debe ser una URL https/);
  }, 120_000);

  it("ingests and activates every document in the corpus folder", async () => {
    runIngestCorpus(["--app-url", APP_URL, "--yes"]);

    const sources = await prisma.chatbotCorpusSource.findMany({
      select: { name: true, version: true, status: true, citeUrl: true },
      orderBy: { name: "asc" },
    });
    for (const source of sources) {
      expect(source.version).toMatch(/^sha256-[0-9a-f]{12}$/);
    }
    expect(
      sources.map(({ name, status, citeUrl }) => ({ name, status, citeUrl }))
    ).toEqual([
      {
        name: "Guía de inventarios de prueba",
        status: CorpusSourceStatus.ACTIVE,
        citeUrl: "https://example.org/guia-inventarios",
      },
      {
        name: "Subcategoría C1 — Otras fuentes",
        status: CorpusSourceStatus.ACTIVE,
        citeUrl: `${APP_URL}/#c1-otras-fuentes`,
      },
      {
        name: "Subcategoría C3 — Otras fuentes",
        status: CorpusSourceStatus.ACTIVE,
        citeUrl: `${APP_URL}/#c3-otras-fuentes`,
      },
    ]);
  }, 120_000);

  // Depends on the previous test's corpus: the point is the second run.
  it("skips unchanged documents on a second run", async () => {
    const output = runIngestCorpus(["--app-url", APP_URL, "--yes"]);

    expect(output).toContain("El corpus ya está al día");
    expect(await prisma.chatbotCorpusSource.count()).toBe(3);
  }, 120_000);
});
