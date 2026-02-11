import { PrismaClient } from "@repo/database";

export async function getTestCountryJobPositionId(
  prisma: PrismaClient
): Promise<bigint> {
  const jobPosition = await prisma.countryJobPosition.findFirst({
    select: { id: true },
  });
  if (!jobPosition) {
    throw new Error("No country job position found");
  }
  return jobPosition.id;
}
