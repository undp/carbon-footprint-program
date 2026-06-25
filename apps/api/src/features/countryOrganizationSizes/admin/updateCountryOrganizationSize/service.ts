import { type PrismaClient, Prisma, InventoryStatus } from "@repo/database";
import {
  type UpdateCountryOrganizationSizeRequest,
  type UpdateCountryOrganizationSizeResponse,
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
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const updateCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCountryOrganizationSizeRequest,
  user: User | null
): Promise<UpdateCountryOrganizationSizeResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sizeId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const updateData: Prisma.CountryOrganizationSizeUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) {
        updateData.description = normalizeDescriptionInput(data.description);
      }

      // A size has no parent, so it can only be re-identified by renaming. Renaming
      // a size that a user already selected is blocked: both the live
      // `organization_data.countryOrganizationSizeId` rows and the frozen
      // `carbon_inventory.organizationData` JSON snapshot (which stores `sizeId` as a
      // string — see `buildOrganizationDataSnapshot`) resolve the display name by id
      // at read time, so a rename would make those users see a name they never chose.
      // Only a genuine rename is guarded (a no-op or description-only edit never
      // blocks), and only ACTIVE inventories matter — a DELETED inventory's frozen
      // reference is inert. Re-identification is only allowed by soft-deleting and
      // re-creating the size, so existing references keep resolving to the original
      // name.
      if (data.name !== undefined) {
        const existing = await tx.countryOrganizationSize.findUnique({
          where: { id: sizeId },
          select: { name: true },
        });
        if (!existing) {
          throw new ResourceNotFoundError("CountryOrganizationSize", id);
        }

        if (data.name !== existing.name) {
          const [organizationDataCount, carbonInventoryCount] =
            await Promise.all([
              tx.organizationData.count({
                where: { countryOrganizationSizeId: sizeId },
              }),
              tx.carbonInventory.count({
                where: {
                  status: InventoryStatus.ACTIVE,
                  organizationData: {
                    path: ["sizeId"],
                    equals: sizeId.toString(),
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
              resourceType: "CountryOrganizationSize",
              attemptedChange: "name",
              referencedBy: {
                organizationData: organizationDataCount,
                carbonInventories: carbonInventoryCount,
              },
            });
          }
        }
      }

      const updated = await tx.countryOrganizationSize.update({
        where: { id: sizeId },
        data: updateData,
        select: adminCountryOrganizationSizeSelect,
      });
      return mapCountryOrganizationSizeToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new ResourceNotFoundError("CountryOrganizationSize", id);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "CountryOrganizationSize",
            context: "UPDATE",
          });
        }
      }
    }
    throw error;
  }
};
