#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import { CorpusSourceStatus } from "@repo/database/enums";
import {
  collectCorpusDocuments,
  readCorpusManifest,
  resolveCiteUrl,
  type CorpusDocument,
} from "./corpusManifest.js";
import {
  AzureAccessError,
  validateAzureAccess,
  type AzureAccessSummary,
} from "./azureAccess.js";

const API_ROOT = resolve(import.meta.dirname, "../..");
const DEFAULT_CORPUS_DIR = resolve(API_ROOT, "../../corpus");
const INGEST_SCRIPT = resolve(import.meta.dirname, "ingestCorpus.ts");
const ACTIVATE_SCRIPT = resolve(import.meta.dirname, "activateCorpusSource.ts");

/**
 * How long to keep retrying the test embedding after assigning the role here:
 * Azure documents up to ten minutes before a new assignment is honoured on the
 * data plane, and until then the call is refused with 401/403.
 */
const ROLE_PROPAGATION_TIMEOUT_MS = 10 * 60_000;
const ROLE_PROPAGATION_RETRY_MS = 20_000;

const USAGE = `\
Uso: pnpm chatbot:ingest-corpus [--app-url <https-url>] [--corpus-dir <ruta>] [--yes | --check]

Ingesta todos los documentos de la carpeta corpus/ en tres pasos:
  1. Valida los requisitos (manifest, base de datos, pgvector, proveedor de embeddings).
  2. Muestra la configuración detectada y pide confirmación.
  3. Ingesta los documentos nuevos o modificados y ofrece activarlos.

Cada documento se versiona por el hash de su contenido: los que ya están
ACTIVE sin cambios se saltan, así que volver a correr el script es seguro.

Argumentos:
  --app-url <url>      URL pública (https) de la app. Las explicaciones se citan
                       como <url>#<archivo>. Default: el primer origen de
                       ALLOWED_ORIGIN si es https; si no, se pregunta.
  --corpus-dir <ruta>  Carpeta del corpus (default: corpus/ en la raíz del repo).
                       Una ruta relativa se resuelve desde apps/api, no desde
                       la raíz: el comando corre con ese directorio de trabajo.
  --yes                No preguntar: confirma la configuración y activa todo.
                       Necesario si no hay una terminal interactiva.
  --check              Solo valida: corre el paso 1, muestra la configuración y
                       el plan, y sale sin preguntar ni escribir en la base de
                       datos. Sale con 0 si todo está listo para ingerir.

Permisos en Azure (solo con EMBEDDING_PROVIDER="azure-openai"):
  Sin AZURE_OPENAI_API_KEY, el script se autentica con tu sesión de az, que
  necesita un rol con acceso a datos de OpenAI sobre la cuenta, como
  "Cognitive Services OpenAI User". Owner y Contributor NO alcanzan: son roles
  de administración, sin acceso a datos. Para asignártelo (bash):

    az role assignment create \\
      --assignee-object-id "$(az ad signed-in-user show --query id -o tsv)" \\
      --assignee-principal-type User \\
      --role "Cognitive Services OpenAI User" \\
      --scope "$(az cognitiveservices account show -g <grupo> -n <cuenta> --query id -o tsv)"

  Si falta el rol, el script ofrece asignártelo (solo en modo interactivo;
  --check y --yes nunca cambian permisos) y espera a que se propague, hasta
  10 minutos. Si no, imprime este comando con los valores ya resueltos.
`;

type Options = {
  appUrl?: string;
  corpusDir: string;
  assumeYes: boolean;
  checkOnly: boolean;
};

type PlannedDocument = CorpusDocument & {
  /** ACTIVE with this exact content and embedding model: nothing to do. */
  isActive: boolean;
  /**
   * ACTIVE with this exact content but embedded by another model. Its vectors
   * are not comparable with the ones this run writes, so it is re-ingested.
   */
  hasOtherModel: boolean;
  /** An earlier run ingested this content, with this model, but never activated it. */
  pendingDraftId?: bigint;
};

class CorpusFolderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorpusFolderError";
  }
}

const parseArgs = (argv: string[]): Options => {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const options: Options = {
    corpusDir: DEFAULT_CORPUS_DIR,
    assumeYes: false,
    checkOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--yes") {
      options.assumeYes = true;
      continue;
    }
    if (flag === "--check") {
      options.checkOnly = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CorpusFolderError(`Falta el valor de ${flag}.\n\n${USAGE}`);
    }
    if (flag === "--app-url") options.appUrl = value;
    else if (flag === "--corpus-dir") options.corpusDir = resolve(value);
    else
      throw new CorpusFolderError(`Argumento desconocido: ${flag}\n\n${USAGE}`);
    i++;
  }
  if (options.assumeYes && options.checkOnly) {
    throw new CorpusFolderError(
      "--yes y --check se excluyen: --yes ingesta y activa, --check no escribe nada."
    );
  }
  return options;
};

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/** Show which database is targeted without printing its password. */
const maskDatabaseUrl = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    return "<no es una URL válida>";
  }
};

const ok = (message: string): void => {
  process.stdout.write(`  ✓ ${message}\n`);
};

const heading = (message: string): void => {
  process.stdout.write(`\n${message}\n`);
};

/**
 * Run one of the existing CLIs as a child process, so each document goes
 * through exactly the validation, transaction, and audit trail an operator
 * would get invoking it by hand. `--import tsx` rather than the `tsx` binary
 * keeps the spawn shell-free on Windows, where the binary is a `.cmd`.
 */
const runCli = (script: string, args: string[]): boolean =>
  spawnSync(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: API_ROOT,
    stdio: "inherit",
  }).status === 0;

const main = async (argv: string[]): Promise<number> => {
  const options = parseArgs(argv);
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = async (question: string): Promise<boolean> => {
    const answer = await prompt.question(`${question} [s/N] `);
    return /^(s|si|sí|y|yes)$/i.test(answer.trim());
  };
  const confirm = async (question: string): Promise<boolean> => {
    if (options.assumeYes) {
      process.stdout.write(`${question} [s/N] s (--yes)\n`);
      return true;
    }
    return ask(question);
  };

  // -------------------------------------------------------------------------
  // 1. Requisitos
  // -------------------------------------------------------------------------
  heading("1. Validando requisitos");

  if (!options.assumeYes && !options.checkOnly && !process.stdin.isTTY) {
    throw new CorpusFolderError(
      "No hay una terminal interactiva para confirmar. Vuelve a correr con --yes."
    );
  }

  const manifest = await readCorpusManifest(options.corpusDir);
  const documents = await collectCorpusDocuments(options.corpusDir, manifest);
  ok(`Corpus en ${options.corpusDir}: ${documents.length} documentos legibles`);

  if (!process.env.DATABASE_URL?.trim()) {
    throw new CorpusFolderError(
      "DATABASE_URL no está definida. Carga el entorno (ej. direnv allow) y vuelve a correr."
    );
  }

  // Imported here rather than at the top: the environment module validates
  // every variable on load and throws in English with no context, so loading
  // it inside the step turns a misconfiguration into a step-1 failure.
  const environment = await import("@/config/environment.js").catch(
    (err: unknown) => {
      const reason = err instanceof Error ? err.message : String(err);
      throw new CorpusFolderError(
        `La configuración del API no es válida: ${reason}`
      );
    }
  );
  ok("Variables de ambiente del API válidas");

  // The environment module falls back to "mock" when EMBEDDING_PROVIDER is
  // unset, and checks the Azure variables only when CHATBOT_ENABLED=true —
  // yet seeding the corpus before switching the chatbot on is a supported
  // workflow. Either gap lets a misconfigured run through (a silent mock
  // writes noise into a real database), so the provider has to be chosen
  // explicitly and its variables present.
  if (!process.env.EMBEDDING_PROVIDER?.trim()) {
    throw new CorpusFolderError(
      'EMBEDDING_PROVIDER no está definida y el API usaría "mock" por defecto. ' +
        'Define "azure-openai" para un corpus real, o "mock" explícitamente para probar el flujo.'
    );
  }
  let azureTarget: { endpoint: string; deploymentName: string } | undefined;
  if (environment.EMBEDDING_PROVIDER === "azure-openai") {
    const endpoint = environment.AZURE_OPENAI_ENDPOINT;
    const deploymentName = environment.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME;
    if (!endpoint || !deploymentName) {
      const missing = [
        ...(endpoint ? [] : ["AZURE_OPENAI_ENDPOINT"]),
        ...(deploymentName ? [] : ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"]),
      ];
      throw new CorpusFolderError(
        `EMBEDDING_PROVIDER="azure-openai" necesita: ${missing.join(", ")}.`
      );
    }
    if (!isHttpsUrl(endpoint)) {
      throw new CorpusFolderError(
        `AZURE_OPENAI_ENDPOINT debe ser una URL https (ej. https://<cuenta>.openai.azure.com/); se recibió "${endpoint}".`
      );
    }
    azureTarget = { endpoint, deploymentName };
    ok(
      `Proveedor de embeddings azure-openai: ${endpoint} (deployment ${deploymentName})`
    );
  } else {
    ok('Proveedor de embeddings "mock", definido explícitamente');
  }

  if (environment.IS_PROD && environment.EMBEDDING_PROVIDER === "mock") {
    throw new CorpusFolderError(
      'EMBEDDING_PROVIDER="mock" no puede ingerir con NODE_ENV=production: sus ' +
        "vectores no tienen relación con el texto. Configura " +
        'EMBEDDING_PROVIDER="azure-openai".'
    );
  }

  const prisma = new PrismaClient({ adapter: generatePrismaAdapter() });
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new CorpusFolderError(
        `No se pudo conectar a la base de datos: ${reason}`
      );
    }
    ok("Conexión a la base de datos");

    const [vectorExtension] = await prisma.$queryRaw<
      Array<{ extversion: string }>
    >`SELECT extversion FROM pg_extension WHERE extname = 'vector'`;
    if (!vectorExtension) {
      throw new CorpusFolderError(
        "La extensión pgvector no está instalada en la base de datos. " +
          "Ver docs/operations/production-deployment.md."
      );
    }
    ok(`Extensión pgvector ${vectorExtension.extversion}`);

    const [corpusTable] = await prisma.$queryRaw<
      Array<{ table: string | null }>
    >`SELECT to_regclass('chatbot_corpus_source')::text AS table`;
    if (!corpusTable?.table) {
      throw new CorpusFolderError(
        "Faltan las tablas del corpus: aplica las migraciones antes de ingerir."
      );
    }
    ok("Tablas del corpus (migraciones aplicadas)");

    let azureAccess: AzureAccessSummary | undefined;
    if (azureTarget) {
      azureAccess = await validateAzureAccess(
        {
          ...azureTarget,
          usesApiKey: Boolean(environment.AZURE_OPENAI_API_KEY),
          // Only a person at the terminal may grant a permission: --check
          // changes nothing and --yes must not change Azure behind their back.
          askToAssignRole:
            options.checkOnly || options.assumeYes ? undefined : ask,
        },
        ok
      );
    }

    // A real round trip to the embeddings deployment: catches a wrong
    // endpoint, deployment name, or missing role before any document is
    // parsed, and reports the model that will be written on every chunk.
    // It also covers what the Azure CLI checks cannot: the identity the API
    // actually authenticates as, and the network path to the endpoint.
    const { getEmbeddingProvider } =
      await import("@/features/chatbot/embeddingProvider/index.js");
    // A role assigned a moment ago is refused until it propagates, so only
    // then are 401/403 retried; any other failure is final.
    const retryUntil = azureAccess?.roleJustAssigned
      ? Date.now() + ROLE_PROPAGATION_TIMEOUT_MS
      : 0;
    let embeddingModel: string;
    for (;;) {
      try {
        ({ model: embeddingModel } = await getEmbeddingProvider().embed([
          "Prueba de conexión del corpus",
        ]));
        break;
      } catch (err) {
        const status = (err as { status?: unknown } | null)?.status;
        if ((status === 401 || status === 403) && Date.now() < retryUntil) {
          process.stdout.write(
            `  … el rol todavía no se propaga; reintentando en ${ROLE_PROPAGATION_RETRY_MS / 1000} s\n`
          );
          await sleep(ROLE_PROPAGATION_RETRY_MS);
          continue;
        }
        const reason = err instanceof Error ? err.message : String(err);
        throw new CorpusFolderError(
          `El proveedor de embeddings no respondió: ${reason}`
        );
      }
    }
    ok(`Proveedor de embeddings responde (modelo "${embeddingModel}")`);

    // -----------------------------------------------------------------------
    // 2. Confirmación
    // -----------------------------------------------------------------------
    heading("2. Configuración detectada");

    let appUrl =
      options.appUrl ??
      environment.ALLOWED_ORIGIN?.split(",")
        .map((origin) => origin.trim())
        .find(isHttpsUrl);
    if (!appUrl && !options.assumeYes && !options.checkOnly) {
      appUrl = (
        await prompt.question(
          "URL pública (https) de la app, para citar las explicaciones: "
        )
      ).trim();
    }
    // Reported after the summary rather than here, so --check still shows
    // the whole configuration and plan when this is the only thing missing.
    const validAppUrl = appUrl && isHttpsUrl(appUrl) ? appUrl : undefined;

    const rows: Array<[string, string]> = [
      ["NODE_ENV", process.env.NODE_ENV ?? "<no definida>"],
      ["DATABASE_URL", maskDatabaseUrl(process.env.DATABASE_URL ?? "")],
      ["EMBEDDING_PROVIDER", environment.EMBEDDING_PROVIDER],
      ...(azureAccess
        ? ([
            ["Suscripción Azure", azureAccess.subscription],
            ["Cuenta Azure OpenAI", azureAccess.accountName],
            ["AZURE_OPENAI_ENDPOINT", environment.AZURE_OPENAI_ENDPOINT ?? ""],
            [
              "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME",
              environment.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME ?? "",
            ],
            [
              "AZURE_OPENAI_EMBEDDING_API_VERSION",
              environment.AZURE_OPENAI_EMBEDDING_API_VERSION,
            ],
            [
              "Autenticación",
              environment.AZURE_OPENAI_API_KEY
                ? "API key (AZURE_OPENAI_API_KEY)"
                : `DefaultAzureCredential (az login como ${azureAccess.signedInAs})`,
            ],
          ] satisfies Array<[string, string]>)
        : []),
      ["Modelo de embeddings", embeddingModel],
      ["URL de la app (citas)", validAppUrl ?? "<falta: usa --app-url>"],
    ];
    const labelWidth = Math.max(...rows.map(([label]) => label.length));
    for (const [label, value] of rows) {
      process.stdout.write(`  ${label.padEnd(labelWidth)}  ${value}\n`);
    }

    if (environment.EMBEDDING_PROVIDER === "mock") {
      process.stdout.write(
        '\n  ⚠ EMBEDDING_PROVIDER="mock": los vectores son ruido. Sirve para probar\n' +
          "    el flujo, no para un corpus real — habría que re-ingerir todo después.\n"
      );
    }

    const planned: PlannedDocument[] = [];
    for (const document of documents) {
      const existing = await prisma.chatbotCorpusSource.findMany({
        where: { name: document.label, version: document.version },
        select: { id: true, status: true, embeddingModel: true },
      });
      const active = existing.find(
        (source) => source.status === CorpusSourceStatus.ACTIVE
      );
      planned.push({
        ...document,
        isActive: active?.embeddingModel === embeddingModel,
        hasOtherModel:
          active !== undefined && active.embeddingModel !== embeddingModel,
        pendingDraftId: existing.find(
          (source) =>
            source.status === CorpusSourceStatus.DRAFT &&
            source.embeddingModel === embeddingModel
        )?.id,
      });
    }
    const toIngest = planned.filter(
      (document) => !document.isActive && document.pendingDraftId === undefined
    );
    const pendingDrafts = planned.filter(
      (document) => !document.isActive && document.pendingDraftId !== undefined
    );
    const unchanged = planned.filter((document) => document.isActive).length;

    heading(`Documentos (${planned.length}):`);
    for (const document of planned) {
      const status = document.isActive
        ? "sin cambios"
        : document.pendingDraftId !== undefined
          ? "DRAFT sin activar"
          : document.hasOtherModel
            ? "otro modelo"
            : "por ingerir";
      process.stdout.write(`  ${status.padEnd(17)}  ${document.label}\n`);
    }
    process.stdout.write(
      `\n  ${toIngest.length} por ingerir · ${pendingDrafts.length} DRAFT sin activar · ${unchanged} sin cambios\n`
    );

    // Warnings about what is already in the database. Retrieval compares
    // vectors by cosine distance across every ACTIVE source, so a source
    // embedded by another model does not fail — it silently returns the
    // wrong chunks. The runbook calls this the most dangerous corpus failure.
    const reembedded = planned.filter((document) => document.hasOtherModel);
    if (reembedded.length > 0) {
      process.stdout.write(
        `\n  ⚠ ${reembedded.length} documentos ya activos se generaron con otro modelo de embeddings\n` +
          `    ("otro modelo" arriba): se re-ingieren con "${embeddingModel}" y la versión\n` +
          "    anterior queda OUTDATED al activar.\n"
      );
    }
    const activeOutsideCorpus = await prisma.chatbotCorpusSource.findMany({
      where: {
        status: CorpusSourceStatus.ACTIVE,
        name: { notIn: planned.map((document) => document.label) },
      },
      select: { name: true, version: true, embeddingModel: true },
      orderBy: { name: "asc" },
    });
    if (activeOutsideCorpus.length > 0) {
      process.stdout.write(
        `\n  ⚠ Hay ${activeOutsideCorpus.length} fuentes activas que no están en el corpus; esta\n` +
          "    ingesta no las toca y seguirán respondiendo:\n"
      );
      for (const source of activeOutsideCorpus) {
        process.stdout.write(
          `      ${source.name} (${source.version}, modelo ${source.embeddingModel ?? "desconocido"})\n`
        );
      }
      const otherModelCount = activeOutsideCorpus.filter(
        (source) => source.embeddingModel !== embeddingModel
      ).length;
      if (otherModelCount > 0) {
        process.stdout.write(
          `    ${otherModelCount} de ellas usan otro modelo que "${embeddingModel}": sus vectores no\n` +
            "    son comparables con los nuevos y la búsqueda devolverá chunks incorrectos\n" +
            '    sin ningún error. Desactívalas o re-ingiérelas (runbook, "Re-embed playbook").\n'
        );
      }
    }
    process.stdout.write("\n");

    if (!validAppUrl) {
      throw new CorpusFolderError(
        `Se necesita una URL https para citar las explicaciones; se recibió "${appUrl ?? ""}". Usa --app-url.`
      );
    }
    if (options.checkOnly) {
      process.stdout.write(
        "✓ Todo listo para ingerir. No se escribió nada (--check).\n"
      );
      return 0;
    }
    if (toIngest.length === 0 && pendingDrafts.length === 0) {
      process.stdout.write("El corpus ya está al día. Nada que hacer.\n");
      return 0;
    }
    if (!(await confirm("¿Es correcta esta configuración?"))) {
      process.stdout.write(
        "Cancelado. Corrige las variables de ambiente y vuelve a correr.\n"
      );
      return 1;
    }

    // -----------------------------------------------------------------------
    // 3. Ingesta
    // -----------------------------------------------------------------------
    heading(`3. Ingiriendo ${toIngest.length} documentos`);

    const toActivate = pendingDrafts.map((document) => ({
      label: document.label,
      id: document.pendingDraftId as bigint,
    }));
    const failed: string[] = [];
    for (const [index, document] of toIngest.entries()) {
      process.stdout.write(
        `\n[${index + 1}/${toIngest.length}] ${document.label} (${document.relativePath})\n`
      );
      const succeeded = runCli(INGEST_SCRIPT, [
        document.filePath,
        "--label",
        document.label,
        "--version",
        document.version,
        "--source-type",
        document.sourceType,
        "--scope",
        document.scope,
        "--cite-url",
        resolveCiteUrl(document.citation, validAppUrl),
      ]);
      const draft = succeeded
        ? await prisma.chatbotCorpusSource.findFirst({
            where: {
              name: document.label,
              version: document.version,
              status: CorpusSourceStatus.DRAFT,
            },
            select: { id: true },
          })
        : null;
      if (draft) toActivate.push({ label: document.label, id: draft.id });
      else failed.push(document.label);
    }

    heading("Resumen");
    process.stdout.write(
      `  ${toIngest.length - failed.length} ingeridos · ${failed.length} fallidos · ${unchanged} sin cambios\n`
    );
    for (const label of failed) process.stdout.write(`  ✗ ${label}\n`);

    if (toActivate.length === 0) return failed.length > 0 ? 1 : 0;

    process.stdout.write(
      `\n${toActivate.length} fuentes quedaron en DRAFT: el chatbot no las ve hasta activarlas.\n` +
        "Activar marca como OUTDATED la versión activa anterior de cada una.\n"
    );
    if (!(await confirm(`¿Activar las ${toActivate.length} fuentes?`))) {
      process.stdout.write("\nNo se activó nada. Para activarlas a mano:\n");
      for (const { id } of toActivate) {
        process.stdout.write(
          `  pnpm --filter api chatbot:activate ${id.toString()}\n`
        );
      }
      return failed.length > 0 ? 1 : 0;
    }

    let activationFailures = 0;
    for (const { label, id } of toActivate) {
      process.stdout.write(`  ${label}: `);
      if (!runCli(ACTIVATE_SCRIPT, [id.toString()])) activationFailures++;
    }
    return failed.length > 0 || activationFailures > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
    prompt.close();
  }
};

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n  ✗ ${message}\n`);
    process.exit(
      err instanceof CorpusFolderError || err instanceof AzureAccessError
        ? 2
        : 1
    );
  });
