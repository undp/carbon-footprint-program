import { OrganizationData, PrismaClient } from "@repo/database";
import { randomUUID } from "crypto";

export async function createTestOrganizationData(
  prisma: PrismaClient,
  organizationId: bigint,
  overrides?: Partial<OrganizationData>
): Promise<OrganizationData> {
  return await prisma.organizationData.create({
    data: {
      organizationId,
      legalName: overrides?.legalName ?? `TEST_${randomUUID()}`,
      tradeName: overrides?.tradeName ?? `TEST_${randomUUID()}`,
      taxId: overrides?.taxId ?? `TEST_${randomUUID()}`,
      countryOrganizationSizeId: overrides?.countryOrganizationSizeId,
      representativeFullName:
        overrides?.representativeFullName ?? `TEST_${randomUUID()}`,
      representativeTaxId:
        overrides?.representativeTaxId ?? `TEST_${randomUUID()}`,
      representativeCountryJobPositionId:
        overrides?.representativeCountryJobPositionId ?? 1,
      representativePhone: overrides?.representativePhone ?? `+1234567890`,
      representativeEmail: overrides?.representativeEmail ?? `test@test.com`,
      sectorId: overrides?.sectorId,
      subsectorId: overrides?.subsectorId,
      status: overrides?.status ?? "COMPLETED",
    },
  });
}

export async function cleanupTestOrganizationData(
  prisma: PrismaClient
): Promise<void> {
  await prisma.organizationData.deleteMany();
}
