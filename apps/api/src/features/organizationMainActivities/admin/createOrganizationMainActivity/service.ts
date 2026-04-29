import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import {
  type CreateOrganizationMainActivityRequest,
  type CreateOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { SectorSubsectorMismatchError } from "../../errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

export const createOrganizationMainActivityService = async (
  prismaClient: PrismaClient,
  data: CreateOrganizationMainActivityRequest,
  user: User | null
): Promise<CreateOrganizationMainActivityResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  let sectorId =
    data.countrySectorId !== undefined && data.countrySectorId !== null
      ? BigInt(data.countrySectorId)
      : null;
  const subsectorId =
    data.countrySubsectorId !== undefined && data.countrySubsectorId !== null
      ? BigInt(data.countrySubsectorId)
      : null;

  try {
    return await prismaClient.$transaction(async (tx) => {
      if (sectorId !== null) {
        const sector = await tx.countrySector.findFirst({
          where: { id: sectorId, status: CountrySectorStatus.ACTIVE },
          select: { id: true },
        });
        if (!sector) {
          throw new ResourceNotFoundError(
            "CountrySector",
            data.countrySectorId as string
          );
        }
      }

      if (subsectorId !== null) {
        const subsector = await tx.countrySubsector.findFirst({
          where: { id: subsectorId, status: CountrySubsectorStatus.ACTIVE },
          select: { id: true, countrySectorId: true },
        });
        if (!subsector) {
          throw new ResourceNotFoundError(
            "CountrySubsector",
            data.countrySubsectorId as string
          );
        }
        if (sectorId !== null && subsector.countrySectorId !== sectorId) {
          throw new SectorSubsectorMismatchError();
        }
        // Persist the implied sector when the request only supplied a subsector
        // so the row never stores a subsector with a null parent sector.
        if (sectorId === null) {
          sectorId = subsector.countrySectorId;
        }
      }

      const created = await tx.organizationMainActivity.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          countrySectorId: sectorId,
          countrySubsectorId: subsectorId,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: adminMainActivitySelect,
      });

      return mapMainActivityToAdmin(created);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "OrganizationMainActivity",
            context: "CREATE",
          });
        }
      }
    }
    throw error;
  }
};
