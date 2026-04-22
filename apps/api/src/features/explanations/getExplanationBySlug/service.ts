import type { PrismaClient } from "@repo/database";
import type { GetExplanationBySlugResponse } from "@repo/types";
import { ExplanationNotFoundError } from "../errors.js";

export const getExplanationBySlugService = async (
  prismaClient: PrismaClient,
  slug: string
): Promise<GetExplanationBySlugResponse> => {
  const explanation = await prismaClient.explanation.findUnique({
    where: {
      slug,
    },
  });

  if (!explanation) {
    throw new ExplanationNotFoundError(slug);
  }

  return {
    slug: explanation.slug,
    content: explanation.content,
    visible: explanation.visible,
  };
};
