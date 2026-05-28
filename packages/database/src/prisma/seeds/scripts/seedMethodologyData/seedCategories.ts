import { CategoryStatus, type PrismaClient } from "@/index.js";
import { z } from "zod";
import {
  checkForDuplicates,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedCategories(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding categories...");

  // Flatten categories from all methodologies, keeping reference to methodology
  const categoriesData = nestedData.flatMap((methodology) =>
    methodology.categories.map((category) => ({
      countryIsoCode: methodology.countryIsoCode,
      methodologyVersionName: methodology.name,
      name: category.name,
      synonyms: category.synonyms,
      icon: category.icon,
      color: category.color,
      description: category.description,
      position: category.position,
    }))
  );
  // Check the data has no duplicates based on methodologyVersionName and name
  checkForDuplicates(categoriesData, [
    "countryIsoCode",
    "methodologyVersionName",
    "name",
  ]);

  // Fetch methodology versions with their countries
  const methodologyVersions = await prisma.methodologyVersion.findMany({
    include: {
      country: true,
    },
  });

  // Create a map of methodology versions by countryIsoCode and name
  const methodologyVersionsByCountryAndName = new Map(
    methodologyVersions.map((mv) => [`${mv.country.isoCode}:${mv.name}`, mv])
  );

  // Group categories per methodology version to handle the partial unique on
  // (methodologyVersionId, position) safely during reordering: shift existing
  // active positions to a high range, then assign final positions.
  const categoriesByMethodologyId = new Map<
    bigint,
    {
      name: string;
      synonyms: string;
      description: string;
      icon: string;
      color: string;
      position: number;
    }[]
  >();
  for (const category of categoriesData) {
    const methodologyVersion = methodologyVersionsByCountryAndName.get(
      `${category.countryIsoCode}:${category.methodologyVersionName}`
    );
    if (!methodologyVersion) {
      throw new Error(
        `Methodology version '${category.methodologyVersionName}' not found for country '${category.countryIsoCode}' in dataset ${dataset}`
      );
    }
    const list = categoriesByMethodologyId.get(methodologyVersion.id) ?? [];
    list.push({
      name: category.name,
      synonyms: category.synonyms,
      description: category.description,
      icon: category.icon,
      color: category.color,
      position: category.position,
    });
    categoriesByMethodologyId.set(methodologyVersion.id, list);
  }

  for (const [methodologyVersionId, items] of categoriesByMethodologyId) {
    const shiftOffset =
      Math.max(...items.map((i) => i.position), items.length) + 1_000_000;
    await prisma.$transaction(async (tx) => {
      await tx.category.updateMany({
        where: {
          methodologyVersionId,
          status: { not: CategoryStatus.DELETED },
        },
        data: { position: { increment: shiftOffset } },
      });

      for (const item of items) {
        const { count } = await tx.category.updateMany({
          where: {
            methodologyVersionId,
            name: item.name,
            status: { not: CategoryStatus.DELETED },
          },
          data: {
            synonyms: item.synonyms,
            description: item.description,
            icon: item.icon,
            color: item.color,
            position: item.position,
          },
        });
        if (count === 0) {
          await tx.category.create({
            data: {
              methodologyVersionId,
              name: item.name,
              synonyms: item.synonyms,
              description: item.description,
              icon: item.icon,
              color: item.color,
              position: item.position,
            },
          });
        }
      }
    });
  }

  console.log(
    `   ✓ Ensured ${categoriesData.length} categories exist for dataset ${dataset}`
  );
}
