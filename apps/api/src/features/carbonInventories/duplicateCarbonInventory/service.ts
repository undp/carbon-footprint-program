import {
  CarbonInventoryLineStatus,
  InventoryStatus,
  type PrismaClient,
} from "@repo/database";
import type { DuplicateCarbonInventoryResponse, User } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { generateUniqueCopyName } from "@/helpers/generateUniqueCopyName.js";
import map from "lodash-es/map.js";

export const duplicateCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  user?: User | null
): Promise<DuplicateCarbonInventoryResponse> => {
  const userId = user?.id ? BigInt(user.id) : null;

  // Fetch the source inventory with all ACTIVE children
  const source = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id), status: { not: InventoryStatus.DELETED } },
    include: {
      lines: {
        where: { status: CarbonInventoryLineStatus.ACTIVE },
        include: {
          inputs: {
            where: { isActive: true },
            include: {
              factor: true,
              result: true,
            },
          },
        },
      },
    },
  });

  if (!source) {
    throw new CarbonInventoryNotFoundError(id);
  }

  // Use a transaction to ensure atomicity
  const newInventory = await prismaClient.$transaction(async (tx) => {
    // Generate unique copy name inside the transaction to minimize race window
    // TODO (Mati); you should use the same filter strategy as the one used at getCarbonInventories (by my orgs.)
    const existingNames = await tx.carbonInventory.findMany({
      where: { status: { not: InventoryStatus.DELETED } },
      select: { name: true },
    });
    const names = map(existingNames, "name").filter((n) => n !== null);
    const duplicatedName = generateUniqueCopyName(source.name ?? "", names);

    // 1. Duplicate the CarbonInventory
    const inventory = await tx.carbonInventory.create({
      data: {
        name: duplicatedName,
        organizationId: source.organizationId,
        organizationBranchId: source.organizationBranchId,
        organizationData: source.organizationData ?? undefined,
        year: source.year,
        status: InventoryStatus.ACTIVE,
        usageMode: source.usageMode,
        methodologyVersionId: source.methodologyVersionId,
        preselectedNodesId: source.preselectedNodesId,
        isEditable: true,
        createdById: userId,
        updatedAt: null,
        updatedById: null,
      },
    });

    // 2. Duplicate each ACTIVE line and its children
    for (const line of source.lines) {
      const newLine = await tx.carbonInventoryLine.create({
        data: {
          carbonInventoryId: inventory.id,
          subcategoryId: line.subcategoryId,
          status: CarbonInventoryLineStatus.ACTIVE,
          createdById: userId,
          updatedAt: null,
          updatedById: null,
        },
      });

      for (const input of line.inputs) {
        const newInput = await tx.carbonInventoryLineInput.create({
          data: {
            lineId: newLine.id,
            inputType: input.inputType,
            selection1Id: input.selection1Id,
            selection2Id: input.selection2Id,
            quantity: input.quantity,
            measurementUnitId: input.measurementUnitId,
            directTotalEmissions: input.directTotalEmissions,
            manualFactor: input.manualFactor,
            manualFactorSource: input.manualFactorSource,
            manualFactorRateUnitId: input.manualFactorRateUnitId,
            comment: input.comment,
            isActive: true,
            createdById: userId,
            updatedAt: null,
            updatedById: null,
          },
        });

        // Duplicate factor if exists
        if (input.factor) {
          await tx.carbonInventoryLineFactor.create({
            data: {
              lineInputId: newInput.id,
              emissionFactorId: input.factor.emissionFactorId,
              appliedFactorValue: input.factor.appliedFactorValue,
              appliedFactorRateUnitId: input.factor.appliedFactorRateUnitId,
              appliedFactorSource: input.factor.appliedFactorSource,
              derivationDetails: input.factor.derivationDetails ?? undefined,
              createdById: userId,
              updatedAt: null,
              updatedById: null,
            },
          });
        }

        // Duplicate result if exists
        if (input.result) {
          await tx.carbonInventoryLineResult.create({
            data: {
              lineInputId: newInput.id,
              totalEmissions: input.result.totalEmissions,
              resultDetails: input.result.resultDetails ?? undefined,
              calculatedAt: input.result.calculatedAt,
              createdById: userId,
              updatedAt: null,
              updatedById: null,
            },
          });
        }
      }
    }

    return inventory;
  });

  return { id: newInventory.id.toString() };
};
