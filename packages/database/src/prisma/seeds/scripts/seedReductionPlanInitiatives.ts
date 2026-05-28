import { ReductionPlanInitiativeStatus, type PrismaClient } from "@/index.js";
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

const ReductionPlanInitiativesSeedDataSchema = z.array(
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

export async function seedReductionPlanInitiatives(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding reduction plan initiatives...");

  const reductionPlanInitiativesData =
    ReductionPlanInitiativesSeedDataSchema.parse(
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
    status: ReductionPlanInitiativeStatus;
  }[] = [];

  for (const group of reductionPlanInitiativesData) {
    const subcategory = subcategoryByName.get(group.subcategoryName);
    if (!subcategory) {
      throw new Error(
        `Subcategory '${group.subcategoryName}' not found for dataset ${dataset}`
      );
    }

    for (const reductionPlanInitiative of group.initiatives) {
      initiativesToCreate.push({
        subcategoryId: subcategory.id,
        title: reductionPlanInitiative.title,
        description: reductionPlanInitiative.description,
        status: ReductionPlanInitiativeStatus.ACTIVE,
      });
    }
  }

  // Upsert by (subcategoryId, title) — the partial unique index scopes to
  // ACTIVE rows, so re-runs propagate description changes without duplicating.
  for (const initiative of initiativesToCreate) {
    const { count } = await prisma.reductionPlanInitiative.updateMany({
      where: {
        subcategoryId: initiative.subcategoryId,
        title: initiative.title,
        status: ReductionPlanInitiativeStatus.ACTIVE,
      },
      data: { description: initiative.description },
    });
    if (count === 0) {
      await prisma.reductionPlanInitiative.create({ data: initiative });
    }
  }

  console.log(
    `   ✓ Ensured ${initiativesToCreate.length} initiatives exist for dataset ${dataset}`
  );
}
