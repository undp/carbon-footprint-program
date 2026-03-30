import { InitiativeStatus, type PrismaClient } from "@/index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  generateSeedDataPath,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const InitiativesSeedDataSchema = z.array(
  z.object({
    subcategoryName: z.string().min(1),
    initiatives: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
    ),
  })
);

export async function seedInitiatives(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding initiatives...");

  const initiativesData = InitiativesSeedDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "initiatives.json", dataset),
        "utf-8"
      )
    )
  );

  // Fetch all subcategories to map by name
  const subcategories = await prisma.subcategory.findMany();
  const subcategoryByName = new Map(
    subcategories.map((sub) => [sub.name, sub])
  );

  // Flatten initiatives and resolve subcategory IDs
  const initiativesToCreate: {
    subcategoryId: bigint;
    title: string;
    description: string;
    status: InitiativeStatus;
  }[] = [];

  for (const group of initiativesData) {
    const subcategory = subcategoryByName.get(group.subcategoryName);
    if (!subcategory) {
      throw new Error(
        `Subcategory '${group.subcategoryName}' not found for dataset ${dataset}`
      );
    }

    for (const initiative of group.initiatives) {
      initiativesToCreate.push({
        subcategoryId: subcategory.id,
        title: initiative.title,
        description: initiative.description,
        status: InitiativeStatus.ACTIVE,
      });
    }
  }

  await prisma.initiative.createMany({
    data: initiativesToCreate,
    skipDuplicates: true,
  });

  const count = await prisma.initiative.count();
  console.log(`   ✓ Ensured ${count} initiatives exist for dataset ${dataset}`);
}
