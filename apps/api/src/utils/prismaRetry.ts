import { Prisma, type PrismaClient } from "@repo/database";

type TransactionCallback<T> = (
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
) => Promise<T>;

function isSerializationError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function withSerializableRetry<T>(
  prismaClient: PrismaClient,
  callback: TransactionCallback<T>
): Promise<T> {
  try {
    return await prismaClient.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (firstError) {
    if (!isSerializationError(firstError)) {
      throw firstError;
    }
    return await prismaClient.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}
