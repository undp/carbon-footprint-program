import type { Explanation as PrismaExplanation } from "@repo/database";
import type { GetAllExplanationsResponse } from "@repo/types";

type ExplanationRow = Pick<
  PrismaExplanation,
  | "slug"
  | "name"
  | "description"
  | "content"
  | "createdAt"
  | "updatedAt"
  | "createdById"
  | "updatedById"
>;

export function mapExplanationToResponse(
  row: ExplanationRow
): GetAllExplanationsResponse[number] {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
  };
}
