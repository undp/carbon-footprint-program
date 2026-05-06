#!/usr/bin/env tsx
import { PrismaClient } from "@repo/database";
import { CorpusSourceStatus } from "@repo/database/enums";

const USAGE = `\
Uso: pnpm --filter api chatbot:activate <source-id>

Activa atómicamente una fuente DRAFT, marcando como OUTDATED cualquier
fuente ACTIVE previa con el mismo (name, scope). Refusa si la fuente no
está en estado DRAFT.
`;

class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgumentError";
  }
}

const parseArgs = (argv: string[]): { sourceId: bigint } => {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const [raw] = argv;
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    throw new CliArgumentError(
      `<source-id> debe ser un entero positivo; se recibió "${raw}".`
    );
  }
  return { sourceId: BigInt(raw) };
};

const main = async (argv: string[]): Promise<number> => {
  let parsed: { sourceId: bigint };
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    if (err instanceof CliArgumentError) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    throw err;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.chatbotCorpusSource.findUnique({
        where: { id: parsed.sourceId },
        select: { id: true, name: true, scope: true, status: true },
      });
      if (!target) {
        throw new CliArgumentError(
          `No existe ninguna fuente con id ${parsed.sourceId.toString()}.`
        );
      }
      // Acquire identity-scoped advisory lock keyed on (name, scope) BEFORE
      // we perform the DRAFT validation so concurrent activates serialize.
      const lockKey = `chatbot-corpus:${target.name}:${target.scope}`;
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(('x' || substr(md5(${lockKey}), 1, 16))::bit(64)::bigint)
      `;
      // Re-read after acquiring the lock — a competing activate may have
      // already flipped the target row.
      const locked = await tx.chatbotCorpusSource.findUnique({
        where: { id: parsed.sourceId },
        select: { id: true, name: true, scope: true, status: true },
      });
      if (!locked) {
        throw new CliArgumentError(
          `No existe ninguna fuente con id ${parsed.sourceId.toString()}.`
        );
      }
      if (locked.status !== CorpusSourceStatus.DRAFT) {
        throw new CliArgumentError(
          `La fuente ${locked.id.toString()} no está en estado DRAFT (estado actual: ${locked.status}).`
        );
      }
      // Single timestamp for the cutover so the OUTDATED predecessor's
      // deactivated_at and the new ACTIVE's activated_at are exactly equal —
      // the spec models activation as one atomic instant; treating these as
      // separate `new Date()` calls leaks a few-millisecond drift into the
      // history that confuses tests and analytics.
      const now = new Date();
      await tx.chatbotCorpusSource.updateMany({
        where: {
          name: locked.name,
          scope: locked.scope,
          status: CorpusSourceStatus.ACTIVE,
        },
        data: {
          status: CorpusSourceStatus.OUTDATED,
          deactivatedAt: now,
        },
      });
      await tx.chatbotCorpusSource.update({
        where: { id: locked.id },
        data: {
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: now,
        },
      });
    });

    process.stdout.write(
      `Fuente ${parsed.sourceId.toString()} activada exitosamente.\n`
    );
    return 0;
  } catch (err) {
    if (err instanceof CliArgumentError) {
      process.stderr.write(`${err.message}\n`);
      return 3;
    }
    if (err instanceof Error) {
      process.stderr.write(`Error durante la activación: ${err.message}\n`);
    } else {
      process.stderr.write(
        `Error desconocido durante la activación: ${String(err)}\n`
      );
    }
    return 1;
  } finally {
    await prisma.$disconnect();
  }
};

const argv = process.argv.slice(2);
main(argv).then((code) => process.exit(code));
