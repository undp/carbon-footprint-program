import type { PrismaClient } from "@repo/database";
import type {
  UpdateExplanationRequest,
  UpdateExplanationResponse,
} from "@repo/types";
import { EXPLANATION_CATALOG } from "@repo/constants";
import { ExplanationNotFoundError } from "../../errors.js";
import { mapExplanationToResponse } from "../../mappers.js";

export const updateExplanationService = async (
  prismaClient: PrismaClient,
  slug: string,
  body: UpdateExplanationRequest,
  userId: bigint | null
): Promise<UpdateExplanationResponse> => {
  if (!Object.prototype.hasOwnProperty.call(EXPLANATION_CATALOG, slug)) {
    throw new ExplanationNotFoundError(slug);
  }

  return prismaClient.$transaction(async (tx) => {
    const existing = await tx.explanation.findUnique({
      where: { slug },
      select: { slug: true },
    });

    if (!existing) {
      throw new ExplanationNotFoundError(slug);
    }

    const updated = await tx.explanation.update({
      where: { slug },
      data: {
        content: body.content,
        updatedById: userId,
      },
      select: {
        slug: true,
        name: true,
        description: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        updatedById: true,
      },
    });

    return mapExplanationToResponse(updated);
  });
};
