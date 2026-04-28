import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import {
  type SwapCountryOrganizationSizePositionsRequest,
  type SwapCountryOrganizationSizePositionsResponse,
  type User,
} from "@repo/types";
import createError from "@fastify/error";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

const SameSizeError = createError(
  "SAME_ORGANIZATION_SIZE",
  "Cannot swap an organization size with itself.",
  400
);

const DifferentCountryError = createError(
  "ORGANIZATION_SIZES_DIFFERENT_COUNTRY",
  "Cannot swap organization sizes that belong to different countries.",
  400
);

const InactiveSizeError = createError(
  "INACTIVE_ORGANIZATION_SIZE",
  "Cannot reorder inactive organization sizes.",
  400
);

export const swapCountryOrganizationSizePositionsService = async (
  prismaClient: PrismaClient,
  data: SwapCountryOrganizationSizePositionsRequest,
  user: User | null
): Promise<SwapCountryOrganizationSizePositionsResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const idA = BigInt(data.sizeIdA);
  const idB = BigInt(data.sizeIdB);

  if (idA === idB) {
    const err = new SameSizeError();
    err.message = "No se puede reordenar un tamaño con sigo mismo.";
    throw err;
  }

  return await prismaClient.$transaction(async (tx) => {
    const [sizeA, sizeB] = await Promise.all([
      tx.countryOrganizationSize.findUnique({ where: { id: idA } }),
      tx.countryOrganizationSize.findUnique({ where: { id: idB } }),
    ]);

    if (!sizeA)
      throw new ResourceNotFoundError("CountryOrganizationSize", data.sizeIdA);
    if (!sizeB)
      throw new ResourceNotFoundError("CountryOrganizationSize", data.sizeIdB);

    if (sizeA.countryId !== sizeB.countryId) {
      const err = new DifferentCountryError();
      err.message =
        "No se pueden reordenar tamaños de organizaciones de diferentes países.";
      throw err;
    }
    if (
      sizeA.status !== CountryOrganizationSizeStatus.ACTIVE ||
      sizeB.status !== CountryOrganizationSizeStatus.ACTIVE
    ) {
      const err = new InactiveSizeError();
      err.message = "Solo se pueden reordenar tamaños activos.";
      throw err;
    }

    const positionA = sizeA.position;
    const positionB = sizeB.position;

    // Find a temp position that does not collide with the partial unique index per country.
    const aggregate = await tx.countryOrganizationSize.aggregate({
      where: { countryId: sizeA.countryId },
      _max: { position: true },
    });
    const tempPosition = (aggregate._max.position ?? 0) + 1;

    // Step 1: move A out of the way to a free position
    await tx.countryOrganizationSize.update({
      where: { id: idA },
      data: { position: tempPosition, updatedById: BigInt(user.id) },
    });
    // Step 2: move B to A's original position
    await tx.countryOrganizationSize.update({
      where: { id: idB },
      data: { position: positionA, updatedById: BigInt(user.id) },
    });
    // Step 3: move A to B's original position
    await tx.countryOrganizationSize.update({
      where: { id: idA },
      data: { position: positionB, updatedById: BigInt(user.id) },
    });

    const [updatedA, updatedB] = await Promise.all([
      tx.countryOrganizationSize.findUniqueOrThrow({
        where: { id: idA },
        select: adminCountryOrganizationSizeSelect,
      }),
      tx.countryOrganizationSize.findUniqueOrThrow({
        where: { id: idB },
        select: adminCountryOrganizationSizeSelect,
      }),
    ]);

    return {
      organizationSizes: [
        mapCountryOrganizationSizeToAdmin(updatedA),
        mapCountryOrganizationSizeToAdmin(updatedB),
      ],
    };
  });
};
