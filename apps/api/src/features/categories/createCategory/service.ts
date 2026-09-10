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
      // Locked, not just validated: `position` comes from the request and is
      // checked against the same partial unique index the reorder's temporary
      // position is, so the two writers queue on the parent instead of both
      // claiming the same slot. Reading the status off the locked row also
      // closes the window where a concurrent soft-delete of the methodology
      // version would leave an ACTIVE category hanging off a DELETED parent —
      // the same reason lockCategory exists one level down.
      const methodologyVersionStatus = await lockMethodologyVersion(
        tx,
        BigInt(data.methodologyVersionId)
      );

      if (
        !methodologyVersionStatus ||
        methodologyVersionStatus === MethodologyVersionStatus.DELETED
      ) {
        throw new MethodologyVersionNotFoundForCategoryError();
      }

      return tx.category.create({
        data: {
          methodologyVersionId: BigInt(data.methodologyVersionId),
          name: data.name,
          icon: data.icon,
          color: data.color,
          synonyms: data.synonyms,
          description: data.description,
          explanation: data.explanation ?? null,
          position: data.position,
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
