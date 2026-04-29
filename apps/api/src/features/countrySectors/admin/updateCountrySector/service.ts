import { type PrismaClient, Prisma } from "@repo/database";
import {
  type UpdateCountrySectorRequest,
  type UpdateCountrySectorResponse,
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
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const updateCountrySectorService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCountrySectorRequest,
  user: User | null
): Promise<UpdateCountrySectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const updateData: Prisma.CountrySectorUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        // Tri-state: undefined = no-op, null or "" → null, otherwise the trimmed string.
        updateData.description =
          data.description === null || data.description === ""
            ? null
            : data.description;
      }

      const updated = await tx.countrySector.update({
        where: { id: sectorId },
        data: updateData,
        select: adminCountrySectorSelect,
      });

      return mapCountrySectorToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("CountrySector", id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "CountrySector",
            context: "UPDATE",
          });
        }
      }
    }
    throw error;
  }
};
