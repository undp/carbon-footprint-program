import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import {
  type DeleteCountryOrganizationSizeResponse,
  type User,
} from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const deleteCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteCountryOrganizationSizeResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sizeId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.countryOrganizationSize.findUnique({
      where: { id: sizeId },
      select: { id: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("CountryOrganizationSize", id);
    }

    // Soft-delete is never blocked by catalog references — no other catalog table
    // references country_organization_size. User-data references on
    // organization_data.countryOrganizationSizeId do NOT block.
    const updated = await tx.countryOrganizationSize.update({
      where: { id: sizeId },
      data: {
        status: CountryOrganizationSizeStatus.DELETED,
        updatedById: BigInt(user.id),
      },
      select: adminCountryOrganizationSizeSelect,
    });

    return mapCountryOrganizationSizeToAdmin(updated);
  });
};
