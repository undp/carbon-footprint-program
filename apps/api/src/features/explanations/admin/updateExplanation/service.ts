import { Prisma, type PrismaClient } from "@repo/database";
import type { UpdateExplanationRequest, User } from "@repo/types";
import { ExplanationNotFoundError } from "../../errors.js";

export const updateExplanationService = async (
  prismaClient: PrismaClient,
  slug: string,
  body: UpdateExplanationRequest,
  user: User | null
): Promise<void> => {
  try {
    await prismaClient.explanation.update({
      where: { slug },
      data: {
        content: body.content,
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new ExplanationNotFoundError(slug);
    }
    throw error;
  }
};
