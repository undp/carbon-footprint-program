import type { PrismaClient } from "@repo/database";
import type { GetExplanationByIdResponse } from "@repo/types";
import { ExplanationNotFoundError } from "../errors.js";

export const getExplanationByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetExplanationByIdResponse> => {
  const explanation = await prismaClient.explanation.findUnique({
    where: {
      id: BigInt(id),
    },
  });

  if (!explanation) {
    throw new ExplanationNotFoundError(id);
  }

  return {
    id: explanation.id.toString(),
    name: explanation.name,
    content: explanation.content,
  };
};
