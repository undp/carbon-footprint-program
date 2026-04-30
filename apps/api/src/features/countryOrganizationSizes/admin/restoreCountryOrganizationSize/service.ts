import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
  Prisma,
} from "@repo/database";
import {
  type RestoreCountryOrganizationSizeResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  RestoreOnActiveError,
  attachDetails,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const restoreCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<RestoreCountryOrganizationSizeResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sizeId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const existing = await tx.countryOrganizationSize.findUnique({
        where: { id: sizeId },
        select: {
          id: true,
          status: true,
          countryId: true,
          name: true,
        },
      });
      if (!existing) {
        throw new ResourceNotFoundError("CountryOrganizationSize", id);
      }

      if (existing.status === CountryOrganizationSizeStatus.ACTIVE) {
        throw attachDetails(new RestoreOnActiveError(), {
          resourceType: "CountryOrganizationSize",
        });
      }

      const collision = await tx.countryOrganizationSize.findFirst({
        where: {
          countryId: existing.countryId,
          name: existing.name,
          status: CountryOrganizationSizeStatus.ACTIVE,
          id: { not: sizeId },
        },
        select: { id: true },
      });
      if (collision) {
        throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
          resourceType: "CountryOrganizationSize",
          context: "RESTORE",
        });
      }

      const updated = await tx.countryOrganizationSize.update({
        where: { id: sizeId },
        data: {
          status: CountryOrganizationSizeStatus.ACTIVE,
          updatedById: BigInt(user.id),
        },
        select: adminCountryOrganizationSizeSelect,
      });
      return mapCountryOrganizationSizeToAdmin(updated);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
        resourceType: "CountryOrganizationSize",
        context: "RESTORE",
      });
    }
    throw error;
  }
};
