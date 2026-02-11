import {
  OrganizationDataStatus,
  OrganizationStatus,
  PrismaClient,
} from "@repo/database";
import type {
  CreateOrganizationBody,
  CreateOrganizationResponse,
} from "@repo/types";
import {
  CountryJobPositionNotFoundError,
  CountryOrganizationSizeNotFoundError,
  CountrySectorNotFoundError,
  CountrySubsectorNotFoundError,
} from "../errors.js";

export const createOrganizationService = async (
  prisma: PrismaClient,
  data: CreateOrganizationBody
): Promise<CreateOrganizationResponse> => {
  const countryId = BigInt(1); // TODO: Use actual country from user/context when auth is implemented

  // 1. Validate Foreign Keys (before transaction)
  if (data.countryOrganizationSizeId) {
    const size = await prisma.countryOrganizationSize.findFirst({
      where: {
        id: BigInt(data.countryOrganizationSizeId),
        countryId,
      },
    });
    if (!size) {
      throw new CountryOrganizationSizeNotFoundError(
        data.countryOrganizationSizeId
      );
    }
  }

  if (data.sectorId) {
    const sector = await prisma.countrySector.findFirst({
      where: {
        id: BigInt(data.sectorId),
        countryId,
      },
    });
    if (!sector) {
      throw new CountrySectorNotFoundError(data.sectorId);
    }
  }

  if (data.subsectorId) {
    const subsector = await prisma.countrySubsector.findFirst({
      where: {
        id: BigInt(data.subsectorId),
        countrySector: {
          id: data.sectorId ? BigInt(data.sectorId) : undefined,
          countryId,
        },
      },
    });
    if (!subsector) {
      throw new CountrySubsectorNotFoundError(data.subsectorId);
    }
  }

  const jobPosition = await prisma.countryJobPosition.findFirst({
    where: {
      id: BigInt(data.representativeCountryJobPositionId),
      countryId,
    },
  });
  if (!jobPosition) {
    throw new CountryJobPositionNotFoundError(
      data.representativeCountryJobPositionId
    );
  }

  // 2. Use Prisma Transaction for atomic creation
  return await prisma.$transaction(async (tx) => {
    // Create Organization
    const organization = await tx.organization.create({
      data: {
        countryId,
        status: OrganizationStatus.NOT_ACCREDITED,
        createdById: null, // TODO: Set to authenticated user ID when auth is implemented
      },
    });

    // Create OrganizationData
    const organizationData = await tx.organizationData.create({
      data: {
        organizationId: organization.id,
        status: OrganizationDataStatus.DRAFT,
        legalName: data.legalName,
        tradeName: data.tradeName,
        taxId: data.taxId,
        countryOrganizationSizeId: data.countryOrganizationSizeId
          ? BigInt(data.countryOrganizationSizeId)
          : null,
        sectorId: data.sectorId ? BigInt(data.sectorId) : null,
        subsectorId: data.subsectorId ? BigInt(data.subsectorId) : null,
        address: data.address,
        workersCount: data.workersCount,
        representativeFullName: data.representativeFullName,
        representativeTaxId: data.representativeTaxId,
        representativeCountryJobPositionId: BigInt(
          data.representativeCountryJobPositionId
        ),
        representativePhone: data.representativePhone,
        representativeEmail: data.representativeEmail,
        createdById: null, // TODO: Set to authenticated user ID when auth is implemented
      },
    });

    // TODO: Create UserOrganizationMembership when auth is implemented

    return {
      organizationId: organization.id.toString(),
      organizationDataId: organizationData.id.toString(),
    };
  });
};
