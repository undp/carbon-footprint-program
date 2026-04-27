import { type PrismaClient, Prisma, CountrySectorStatus } from "@repo/database";
import {
  type CreateCountrySubsectorRequest,
  type CreateCountrySubsectorResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const createCountrySubsectorService = async (
  prismaClient: PrismaClient,
  data: CreateCountrySubsectorRequest,
  user: User | null
): Promise<CreateCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(data.countrySectorId);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const parent = await tx.countrySector.findFirst({
        where: { id: sectorId, status: CountrySectorStatus.ACTIVE },
        select: { id: true },
      });
      if (!parent) {
        throw new ResourceNotFoundError("CountrySector", data.countrySectorId);
      }

      const created = await tx.countrySubsector.create({
        data: {
          countrySectorId: parent.id,
          name: data.name,
          description: data.description ?? null,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: adminCountrySubsectorSelect,
      });
      return mapCountrySubsectorToAdmin(created);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          const err = new DatabaseUniqueConstraintViolationError();
          (err as Error & { userMessage?: string }).userMessage =
            "Ya existe un subrubro activo con ese nombre dentro del rubro indicado.";
          throw err;
        }
      }
    }
    throw error;
  }
};
