import type { Prisma } from "@repo/database";
import type { MethodologyVersion as PrismaMethodologyVersion } from "@repo/database";
import type { Methodology, MethodologyWithRelations } from "@repo/types";

// Prisma type for methodology with country and counts
type MethodologyWithCountryAndCounts = Prisma.MethodologyVersionGetPayload<{
  include: {
    country: true;
    _count: {
      select: {
        categories: true;
        carbonInventories: true;
      };
    };
  };
}>;

/**
 * Maps a Prisma MethodologyVersion to the API response format.
 */
export function mapMethodologyToResponse(
  methodology: PrismaMethodologyVersion
): Methodology {
  return {
    id: methodology.id.toString(),
    countryId: methodology.countryId.toString(),
    name: methodology.name,
    description: methodology.description,
    regulation: methodology.regulation,
    version: methodology.version,
    status: methodology.status,
    createdAt: methodology.createdAt.toISOString(),
    updatedAt: methodology.updatedAt?.toISOString() ?? null,
    createdById: methodology.createdById?.toString() ?? null,
    updatedById: methodology.updatedById?.toString() ?? null,
  };
}

/**
 * Maps a Prisma MethodologyVersion with relations to the API response format.
 * Includes country info and counts for categories and carbon inventories.
 */
export function mapMethodologyWithRelationsToResponse(
  methodology: MethodologyWithCountryAndCounts
): MethodologyWithRelations {
  return {
    ...mapMethodologyToResponse(methodology),
    country: {
      id: methodology.country.id.toString(),
      name: methodology.country.name,
      isoCode: methodology.country.isoCode,
    },
    categoryCount: methodology._count.categories,
    carbonInventoryCount: methodology._count.carbonInventories,
  };
}
