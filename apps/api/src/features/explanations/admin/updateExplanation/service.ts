import type { PrismaClient } from "@repo/database";
import type {
  UpdateExplanationRequest,
  UpdateExplanationResponse,
  User,
} from "@repo/types";
import { ExplanationNotFoundError } from "../../errors.js";

export const updateExplanationService = async (
  prismaClient: PrismaClient,
  slug: string,
  body: UpdateExplanationRequest,
  user: User | null
): Promise<UpdateExplanationResponse> => {
  return prismaClient.$transaction(async (tx) => {
    const existing = await tx.explanation.findUnique({
      where: { slug },
      select: { slug: true },
    });

    if (!existing) {
      throw new ExplanationNotFoundError(slug);
    }

    await tx.explanation.update({
      where: { slug },
      data: {
        content: body.content,
        updatedById: user ? BigInt(user.id) : null,
      },
    });

    return {};
  });
};
