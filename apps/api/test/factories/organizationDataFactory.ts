import {
  OrganizationData,
  OrganizationDataStatus,
  PrismaClient,
} from "@repo/database";
import { randomUUID } from "crypto";

export async function createTestOrganizationData(
  prisma: PrismaClient,
  organizationId: bigint,
  overrides?: Partial<OrganizationData>
): Promise<OrganizationData> {
  const genericName = `TEST_${randomUUID()}`;

  const representativeCountryJobPosition =
    await prisma.countryJobPosition.findFirst();
  if (!representativeCountryJobPosition) {
    throw new Error("No country job position found");
  }
  return await prisma.organizationData.create({
    data: {
      organizationId,
      legalName: genericName,
      tradeName: genericName,
      taxId: genericName,
      countryOrganizationSizeId: null,
      representativeFullName: genericName,
      representativeTaxId: genericName,
      representativeCountryJobPositionId: representativeCountryJobPosition.id,
      representativePhone: `+1234567890`,
      representativeEmail: `test@test.com`,
      status: OrganizationDataStatus.COMPLETED,
      ...overrides,
    },
  });
}

export async function cleanupTestOrganizationData(
  prisma: PrismaClient
): Promise<void> {
  await prisma.organizationData.deleteMany();
}
