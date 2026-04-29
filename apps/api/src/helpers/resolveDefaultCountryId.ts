import type { PrismaClient } from "@repo/database";
import { ApplicationConfigError } from "@/errors/index.js";

// TODO: replace with DEFAULT_COUNTRY_ID system parameter once available.
// Mirrors the precedent in createMethodology and createOrganization.
export const resolveDefaultCountryId = async (
  prismaClient: Pick<PrismaClient, "country">
): Promise<bigint> => {
  const country = await prismaClient.country.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!country) {
    throw new ApplicationConfigError(
      "No country found; at least one country must be seeded"
    );
  }

  return country.id;
};
