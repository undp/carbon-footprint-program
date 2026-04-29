import { type PrismaClient, Prisma, CountrySectorStatus } from "@repo/database";
import {
  type UpdateCountrySubsectorRequest,
  type UpdateCountrySubsectorResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const updateCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCountrySubsectorRequest,
  user: User | null
): Promise<UpdateCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const updateData: Prisma.CountrySubsectorUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description =
          data.description === null || data.description === ""
            ? null
            : data.description;
      }
      if (data.countrySectorId !== undefined) {
        const newSectorId = BigInt(data.countrySectorId);
        const parent = await tx.countrySector.findFirst({
          where: { id: newSectorId, status: CountrySectorStatus.ACTIVE },
          select: { id: true },
        });
        if (!parent) {
          throw new ResourceNotFoundError(
            "CountrySector",
            data.countrySectorId
          );
        }
        updateData.countrySector = { connect: { id: newSectorId } };
      }

      const updated = await tx.countrySubsector.update({
        where: { id: subsectorId },
        data: updateData,
        select: adminCountrySubsectorSelect,
      });
      return mapCountrySubsectorToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "CountrySubsector",
            context: "UPDATE",
          });
        }
      }
    }
    throw error;
  }
};
