import { type PrismaClient, Prisma } from "@repo/database";
import type {
  OrganizationDataField,
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
  User,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { mapBigIntField } from "@/utils/bigint.js";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  validateCarbonInventoryIsEditable,
  resolveInventoryOrganizationDataReferences,
} from "../helpers.js";
import { clearCatalogueFactorsOfLines } from "./helpers.js";

export const updateCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCarbonInventoryRequest,
  user: User | null
): Promise<UpdateCarbonInventoryResponse> => {
  // Fetch and validate inventory is editable
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      ...carbonInventoryWithSubmissionsMinimalSelect,
      organizationId: true,
      organizationData: true,
      year: true,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  validateCarbonInventoryIsEditable(inventory);

  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.CarbonInventoryUncheckedUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  const organizationId = mapBigIntField(data.organizationId);
  if (organizationId !== undefined) {
    updateData.organizationId = organizationId;
  }

  const organizationBranchId = mapBigIntField(data.organizationBranchId);
  if (organizationBranchId !== undefined) {
    updateData.organizationBranchId = organizationBranchId;
  }

  if (data.organizationData !== undefined) {
    // When inventory is linked to an organization, preserve the existing companyName
    // to avoid overwriting it with potentially stale data (the official name comes from organizationSummary)
    // Compute isLinked from the effective post-patch organizationId (handles unlinking/linking in same PATCH)
    const effectiveOrganizationId =
      organizationId !== undefined ? organizationId : inventory.organizationId;
    const isLinked = !!effectiveOrganizationId;
    const existingName = (inventory.organizationData as OrganizationDataField)
      ?.name;

    // Normalize undefined to null for JSON fields
    updateData.organizationData = data.organizationData
      ? {
          ...data.organizationData,
          name: isLinked
            ? (existingName ?? null)
            : (data.organizationData.name ?? null),
        }
      : Prisma.JsonNull;
  }

  if (data.year !== undefined) {
    updateData.year = data.year;
  }

  if (data.usageMode !== undefined) {
    updateData.usageMode = data.usageMode;
  }

  // methodologyVersionId cannot be updated via PATCH endpoint
  // It is set only during creation and remains immutable

  const preselectedNodesId = mapBigIntField(data.preselectedNodesId);
  if (preselectedNodesId !== undefined) {
    updateData.preselectedNodesId = preselectedNodesId;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.isEditable !== undefined) {
    updateData.isEditable = data.isEditable;
  }

  // Only set updatedById if there are actual fields to update
  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = user ? BigInt(user.id) : null;
  }

  // A footprint is only offered the factors of its own year, so changing the
  // year invalidates every frozen catalogue factor it holds. The change and the
  // clearing have to land together or not at all — a committed year with the old
  // factors still attached is the state this whole rule exists to prevent.
  const yearChanged = data.year !== undefined && data.year !== inventory.year;

  try {
    const item = await prismaClient.$transaction(async (tx) => {
      if (yearChanged) {
        await clearCatalogueFactorsOfLines(tx, BigInt(id));
      }

      return await tx.carbonInventory.update({
        where: { id: BigInt(id) },
        data: updateData,
      });
    });
    const references = await resolveInventoryOrganizationDataReferences(
      prismaClient,
      item.organizationData
    );
    return mapCarbonInventoryToResponse(item, references);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new CarbonInventoryNotFoundError(id);
      }
    }
    throw error;
  }
};
