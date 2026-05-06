#!/usr/bin/env tsx
import { Prisma, PrismaClient } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";
import { chunkText } from "./chunking.js";
import { parsePdf } from "./parsePdf.js";

const USAGE = `\
Uso: pnpm --filter api chatbot:ingest <pdf-path> --label <label> --version <version> --source-type <PDF> --scope <GLOBAL|NATIONAL> --cite-url <https-url> [--triggered-by <id>]

Argumentos:
  <pdf-path>             Ruta al archivo PDF que será ingerido.
  --label <label>        Etiqueta legible de la fuente (no puede contener ":").
  --name <name>          Alias opcional de --label.
  --version <version>    Versión del documento (texto libre, ej. "v05").
  --source-type <type>   Tipo de fuente (V1 solo acepta "PDF").
  --scope <scope>        Alcance: "GLOBAL" o "NATIONAL".
  --cite-url <url>       URL HTTPS canónica que se mostrará al citar.
  --triggered-by <id>    Identificador opcional del invocador (default cli:<usuario>).
`;

type ParsedArgs = {
  pdfPath: string;
  label: string;
  version: string;
  sourceType: CorpusSourceType;
  scope: CorpusSourceScope;
  citeUrl: string;
  triggeredBy: string;
};

class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgumentError";
  }
}

const parseArgs = (argv: string[]): ParsedArgs => {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const [maybePath, ...rest] = argv;
  if (!maybePath || maybePath.startsWith("--")) {
    throw new CliArgumentError(
      "Falta el argumento posicional <pdf-path>. " + USAGE
    );
  }
  if (!maybePath.toLowerCase().endsWith(".pdf")) {
    throw new CliArgumentError(
      `<pdf-path> debe terminar en ".pdf"; se recibió "${maybePath}".`
    );
  }
  const flagPairs = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new CliArgumentError(
        `Argumento inválido cerca de "${flag ?? ""}". ${USAGE}`
      );
    }
    flagPairs.set(flag, value);
  }
  const labelRaw = flagPairs.get("--label") ?? flagPairs.get("--name");
  if (!labelRaw || labelRaw.trim().length === 0) {
    throw new CliArgumentError("Falta el argumento --label.");
  }
  const label = labelRaw.trim();
  if (label.includes(":")) {
    throw new CliArgumentError(
      '--label no puede contener ":" (colisionaría con el advisory lock de activate).'
    );
  }
  const version = (flagPairs.get("--version") ?? "").trim();
  if (!version) {
    throw new CliArgumentError("Falta el argumento --version.");
  }
  const sourceTypeRaw = (flagPairs.get("--source-type") ?? "").trim();
  if (sourceTypeRaw !== CorpusSourceType.PDF) {
    throw new CliArgumentError(
      'En V1 --source-type solo acepta "PDF"; se recibió ' +
        `"${sourceTypeRaw || "<vacío>"}".`
    );
  }
  const scopeRaw = (flagPairs.get("--scope") ?? "").trim();
  const validScopes = Object.values(CorpusSourceScope) as string[];
  if (!validScopes.includes(scopeRaw)) {
    throw new CliArgumentError(
      `--scope inválido; valores permitidos: ${validScopes.join(", ")}.`
    );
  }
  const citeUrl = (flagPairs.get("--cite-url") ?? "").trim();
  if (!citeUrl) {
    throw new CliArgumentError("Falta el argumento --cite-url.");
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(citeUrl);
  } catch {
    throw new CliArgumentError(
      `--cite-url debe ser una URL HTTPS parseable; se recibió "${citeUrl}".`
    );
  }
  if (parsedUrl.protocol !== "https:") {
    throw new CliArgumentError(
      `--cite-url debe usar protocolo https; se recibió "${parsedUrl.protocol}".`
    );
  }
  const osUser = process.env.USER ?? process.env.USERNAME ?? "unknown";
  const triggeredBy = flagPairs.get("--triggered-by") ?? `cli:${osUser}`;

  return {
    pdfPath: maybePath,
    label,
    version,
    sourceType: sourceTypeRaw as CorpusSourceType,
    scope: scopeRaw as CorpusSourceScope,
    citeUrl,
    triggeredBy,
  };
};

const formatPgVector = (vector: number[]): string => `[${vector.join(",")}]`;

const main = async (argv: string[]): Promise<number> => {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    if (err instanceof CliArgumentError) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    throw err;
  }

  const prisma = new PrismaClient();
  try {
    // Pre-flight: re-ingest collision check on existing DRAFT.
    const existing = await prisma.chatbotCorpusSource.findFirst({
      where: {
        name: args.label,
        version: args.version,
        status: CorpusSourceStatus.DRAFT,
      },
      select: { id: true },
    });
    if (existing) {
      process.stderr.write(
        `Ya existe una fuente en estado DRAFT con nombre "${args.label}" y versión "${args.version}" (id ${existing.id.toString()}). Aborta o elimínala antes de re-ingerir.\n`
      );
      return 3;
    }

    // Insert audit row up-front so a failure leaves a visible trace.
    const auditRow = await prisma.chatbotCorpusIngestRun.create({
      data: {
        sourceId: null,
        triggeredBy: args.triggeredBy,
      },
      select: { id: true },
    });

    // Parse the PDF and chunk the text outside the transaction. Embedding
    // failures (network / quota) bubble up here BEFORE we open any DB write
    // so the source row is never created when embeddings fail.
    const parsed = await parsePdf(args.pdfPath);
    const chunks = chunkText(parsed.text);
    if (chunks.length === 0) {
      process.stderr.write(
        `El PDF en ${args.pdfPath} no produjo chunks utilizables. Aborta.\n`
      );
      return 4;
    }

    const embeddingProvider = getEmbeddingProvider();
    const { vectors, model } = await embeddingProvider.embed(
      chunks.map((c) => c.content)
    );
    if (vectors.length !== chunks.length) {
      process.stderr.write(
        `El proveedor de embeddings devolvió ${vectors.length} vectores para ${chunks.length} chunks. Aborta.\n`
      );
      return 5;
    }

    // Atomic insert: source + N chunks.
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.chatbotCorpusSource.create({
        data: {
          name: args.label,
          version: args.version,
          sourceType: args.sourceType,
          scope: args.scope,
          citeUrl: args.citeUrl,
          citeLabel: args.label,
          status: CorpusSourceStatus.DRAFT,
          embeddingModel: model,
        },
      });
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vectorLiteral = formatPgVector(vectors[i]);
        await tx.$executeRaw`
          INSERT INTO chatbot_corpus_chunk
            (source_id, chunk_index, content, page_number, section_title, tokens, embedding)
          VALUES
            (${source.id}, ${i}, ${chunk.content}, ${chunk.pageNumber}, ${chunk.sectionTitle}, ${chunk.tokens}, ${vectorLiteral}::vector)
        `;
      }
      return source;
    });

    await prisma.chatbotCorpusIngestRun.update({
      where: { id: auditRow.id },
      data: {
        sourceId: result.id,
        completedAt: new Date(),
        chunksCreated: chunks.length,
        embeddingModel: model,
      },
    });

    process.stdout.write(
      `Ingesta exitosa. Fuente creada (id=${result.id.toString()}, status=DRAFT) con ${chunks.length} chunks usando el modelo "${model}".\n`
    );
    return 0;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      process.stderr.write(
        `Error de base de datos durante la ingesta: ${err.message}\n`
      );
    } else if (err instanceof Error) {
      process.stderr.write(`Error durante la ingesta: ${err.message}\n`);
    } else {
      process.stderr.write(
        `Error desconocido durante la ingesta: ${String(err)}\n`
      );
    }
    return 1;
  } finally {
    await prisma.$disconnect();
  }
};

const argv = process.argv.slice(2);
main(argv).then((code) => process.exit(code));
