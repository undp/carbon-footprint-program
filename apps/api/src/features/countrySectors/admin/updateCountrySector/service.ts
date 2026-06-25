import { type PrismaClient, Prisma, InventoryStatus } from "@repo/database";
import {
  type UpdateCountrySectorRequest,
  type UpdateCountrySectorResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  EditBlockedByReferencesError,
  ResourceNotFoundError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { normalizeDescriptionInput } from "@/helpers/normalizeDescriptionInput.js";
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
        updateData.description = normalizeDescriptionInput(data.description);
      }

      // A rubro has no parent, so it can only be re-identified by renaming. Renaming
      // a rubro that a user already selected is blocked: both the live
      // `organization_data.sectorId` rows and the frozen
      // `carbon_inventory.organizationData` JSON snapshot (which stores `sectorId` as a
      // string — see `buildOrganizationDataSnapshot`) resolve the display name by id at
      // read time, so a rename would make those users see a name they never chose. Only
      // a genuine rename is guarded (a no-op or description-only edit never blocks), and
      // only ACTIVE inventories matter — a DELETED inventory's frozen reference is inert.
      // Re-identification is only allowed by soft-deleting and re-creating the rubro, so
      // existing references keep resolving to the original name.
      if (data.name !== undefined) {
        const existing = await tx.countrySector.findUnique({
          where: { id: sectorId },
          select: { name: true },
        });
        if (!existing) {
          throw new ResourceNotFoundError("CountrySector", id);
        }

        if (data.name !== existing.name) {
          const [organizationDataCount, carbonInventoryCount] =
            await Promise.all([
              tx.organizationData.count({ where: { sectorId } }),
              tx.carbonInventory.count({
                where: {
                  status: InventoryStatus.ACTIVE,
                  organizationData: {
                    path: ["sectorId"],
                    equals: sectorId.toString(),
                  },
                },
              }),
            ]);

          if (organizationDataCount > 0 || carbonInventoryCount > 0) {
            const referencedBy: string[] = [];
            if (organizationDataCount > 0)
              referencedBy.push("organization data");
            if (carbonInventoryCount > 0)
              referencedBy.push("carbon inventories");

            const error = new EditBlockedByReferencesError(
              referencedBy.join(", ")
            );
            throw attachDetails(error, {
              resourceType: "CountrySector",
              attemptedChange: "name",
              referencedBy: {
                organizationData: organizationDataCount,
                carbonInventories: carbonInventoryCount,
              },
            });
          }
        }
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
