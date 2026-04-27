import type { Explanation as PrismaExplanation } from "@repo/database";
import type { GetAllExplanationsResponse } from "@repo/types";

type ExplanationRow = Pick<
  PrismaExplanation,
  "slug" | "name" | "description" | "content"
>;

export function mapExplanationToResponse(
  row: ExplanationRow
): GetAllExplanationsResponse[number] {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    content: row.content,
  };
}
