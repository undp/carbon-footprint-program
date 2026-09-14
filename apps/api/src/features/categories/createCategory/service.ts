import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  User,
  type CreateCategoryRequest,
  type CreateCategoryResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import { MethodologyVersionNotFoundForCategoryError } from "../errors.js";
import {
  getNextCategoryPosition,
  lockMethodologyVersion,
  rethrowCategoryUniqueViolation,
} from "../helpers.js";

export const createCategoryService = async (
  prismaClient: PrismaClient,
  data: CreateCategoryRequest,
  user: User | null
): Promise<CreateCategoryResponse> => {
  try {
    const category = await prismaClient.$transaction(async (tx) => {
      // Locked, not just validated: the position below is MAX + 1, exactly the
      // slot a concurrent create or the reorder's temporary position would
      // claim, and all three are checked against the same partial unique index,
      // so they queue on the parent instead of reading the same MAX. Reading
      // the status off the locked row also closes the window where a concurrent
      // soft-delete of the methodology version would leave an ACTIVE category
      // hanging off a DELETED parent — the same reason lockCategory exists one
      // level down.
      const methodologyVersionId = BigInt(data.methodologyVersionId);
      const methodologyVersionStatus = await lockMethodologyVersion(
        tx,
        methodologyVersionId
      );

      if (
        !methodologyVersionStatus ||
        methodologyVersionStatus === MethodologyVersionStatus.DELETED
      ) {
        throw new MethodologyVersionNotFoundForCategoryError();
      }

      const position = await getNextCategoryPosition(tx, methodologyVersionId);

      return tx.category.create({
        data: {
          methodologyVersionId,
          name: data.name,
          icon: data.icon,
          color: data.color,
          synonyms: data.synonyms,
          description: data.description,
          explanation: data.explanation ?? null,
          position,
          status: CategoryStatus.ACTIVE,
          createdById: user ? BigInt(user.id) : null,
          updatedAt: null,
        },
      });
    });
    return mapCategoryToResponse(category);
  } catch (error) {
    rethrowCategoryUniqueViolation(error);
  }
};
