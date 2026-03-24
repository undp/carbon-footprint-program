import { type Prisma, type PrismaClient } from "@repo/database";

export async function getSystemParameterValue(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  key: string
): Promise<string | null> {
  const param = await prismaClient.systemParameter.findUnique({
    where: { key },
    select: { value: true },
  });
  return param?.value ?? null;
}
