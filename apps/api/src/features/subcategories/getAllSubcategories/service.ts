import type { PrismaClient } from "@repo/database";
import type { Prisma } from "@repo/database";
import { CategoryStatus, MethodologyVersionStatus } from "@repo/types";
import type {
  GetAllSubcategoriesResponse,
  GetAllSubcategoriesQuery,
  User,
} from "@repo/types";

function mapSubcategoryToResponse(
  subcategory: Prisma.SubcategoryGetPayload<Record<string, never>>
): GetAllSubcategoriesResponse[number] {
  return {
    id: subcategory.id.toString(),
    categoryId: subcategory.categoryId.toString(),
    name: subcategory.name,
    description: subcategory.description ?? null,
    examples: subcategory.examples ?? null,
    createdAt: subcategory.createdAt.toISOString(),
    updatedAt: subcategory.updatedAt?.toISOString() ?? null,
    createdById: subcategory.createdById?.toString() ?? null,
    updatedById: subcategory.updatedById?.toString() ?? null,
  };
}

export const getAllSubcategoriesService = async (
  prismaClient: PrismaClient,
  query: GetAllSubcategoriesQuery | null,
  _user: User | null
): Promise<GetAllSubcategoriesResponse> => {
  let methodologyVersionId: bigint | undefined;

  if (query?.methodologyVersionId) {
    methodologyVersionId = BigInt(query.methodologyVersionId);
  } else {
    const published = await prismaClient.methodologyVersion.findFirst({
      where: { status: MethodologyVersionStatus.PUBLISHED },
      select: { id: true },
    });
    methodologyVersionId = published?.id;
  }

  if (!methodologyVersionId) return [];

  const subcategories = await prismaClient.subcategory.findMany({
    where: {
      category: {
        methodologyVersionId,
        status: { not: CategoryStatus.DELETED },
      },
    },
    orderBy: { name: "asc" },
  });

  return subcategories.map(mapSubcategoryToResponse);
};
