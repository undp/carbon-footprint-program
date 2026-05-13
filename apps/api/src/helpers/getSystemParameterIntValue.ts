import { type Prisma, type PrismaClient } from "@repo/database";
import { ApplicationConfigError } from "@/errors/index.js";

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
  const param = await prismaClient.systemParameter.findUnique({
    where: { key },
    select: { value: true, minValue: true, maxValue: true },
  });

  if (param === null) {
    throw new ApplicationConfigError(`${key} is not set`);
  }

  if (!/^[+-]?\d+$/.test(param.value)) {
    throw new ApplicationConfigError(
      `${key} has non-integer value "${param.value}"`
    );
  }
  const parsed = Number.parseInt(param.value, 10);
  if (Number.isNaN(parsed)) {
    throw new ApplicationConfigError(
      `${key} has non-integer value "${param.value}"`
    );
  }

  if (param.minValue !== null && parsed < param.minValue) {
    throw new ApplicationConfigError(
      `${key} value (${parsed}) is below configured minimum (${param.minValue})`
    );
  }

  if (param.maxValue !== null && parsed > param.maxValue) {
    throw new ApplicationConfigError(
      `${key} value (${parsed}) is above configured maximum (${param.maxValue})`
    );
  }

  return parsed;
}
