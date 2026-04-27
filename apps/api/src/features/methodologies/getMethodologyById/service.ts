import {
  CategoryStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import type { GetMethodologyByIdResponse } from "@repo/types";
import { MethodologyNotFoundError } from "../errors.js";

export const getMethodologyByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetMethodologyByIdResponse> => {
  const methodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      id: BigInt(id),
      status: {
        in: [
          MethodologyVersionStatus.PUBLISHED,
          MethodologyVersionStatus.UNPUBLISHED,
        ],
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      categories: {
        where: { status: CategoryStatus.ACTIVE },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          subcategories: {
            where: { status: SubcategoryStatus.ACTIVE },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError();
  }

  return {
    id: methodology.id.toString(),
    name: methodology.name,
    status: methodology.status,
    categories: methodology.categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id.toString(),
        name: subcategory.name,
      })),
    })),
  };
};
