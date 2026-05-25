import { type Prisma, type PrismaClient } from "@repo/database";
import { parseSystemParameterInt } from "./parseSystemParameterInt.js";

/**
 * Reads a numeric system parameter and validates it against the bounds stored
 * on the same row (`min_value` / `max_value`). Throws `ApplicationConfigError`
 * if the row is missing, the value is not an integer, or it falls outside the
 * declared bounds. Use this for any parameter whose semantics are "integer
 * within a configurable range".
 */
export async function getSystemParameterIntValue(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  key: string
): Promise<number> {
  const row = await prismaClient.systemParameter.findUnique({
    where: { key },
    select: { value: true, minValue: true, maxValue: true },
  });

  return parseSystemParameterInt(key, row);
}
