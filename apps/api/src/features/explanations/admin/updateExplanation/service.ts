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
  const { count } = await prismaClient.explanation.updateMany({
    where: { slug },
    data: {
      content: body.content,
      updatedById: user ? BigInt(user.id) : null,
    },
  });

  if (count === 0) {
    throw new ExplanationNotFoundError(slug);
  }

  return {};
};
