import { type PrismaClient } from "@/index.js";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type SeedsDataset } from "@/prisma/seeds/utils/index.js";
import { EXPLANATION_CATALOG } from "@repo/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The `explanation` table is retained for future standalone-explanation use cases,
// but is not populated here: category/subcategory explanations are inlined on their rows.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

interface ExplanationFile {
  fileName: string;
  categoryPosition: number;
  normalizedName: string;
  content: string;
}

function readExplanationFilesFromDir(
  dataset: SeedsDataset,
  subdir: "subcategories" | "categories"
): ExplanationFile[] {
  const explanationsDir = join(
    __dirname,
    `../data/${dataset}/explanations/${subdir}`
  );

  let files: string[];
  try {
    files = readdirSync(explanationsDir).filter((f) => f.endsWith(".md"));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.log(
        `   ⚠ No explanations/${subdir} directory found for dataset ${dataset}, skipping.`
      );
      return [];
    }
    throw error;
  }

  return files.map((fileName) => {
    const match = fileName.match(/^c(\d+)_(.+)\.md$/);
    if (!match) {
      throw new Error(
        `Invalid explanation filename format: '${fileName}'. Expected c{position}_{name}.md`
      );
    }

    const categoryPosition = parseInt(match[1]!, 10);
    const normalizedName = normalizeName(match[2]!);
    const content = readFileSync(join(explanationsDir, fileName), "utf-8");

    return {
      fileName,
      categoryPosition,
      normalizedName,
      content,
    };
  });
}

async function seedCategoryExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  const categoryFiles = readExplanationFilesFromDir(dataset, "categories");

  if (categoryFiles.length === 0) {
    console.log("   ✓ No category explanation files to seed.");
    return;
  }

  const categories = await prisma.category.findMany();

  const categoryLookup = new Map(
    categories.map((cat) => [`${cat.position}:${normalizeName(cat.name)}`, cat])
  );

  let updatedCount = 0;

  for (const file of categoryFiles) {
    const lookupKey = `${file.categoryPosition}:${file.normalizedName}`;
    const category = categoryLookup.get(lookupKey);

    if (!category) {
      console.warn(
        `   ⚠ No category match for file '${file.fileName}' (lookup key: ${lookupKey})`
      );
      continue;
    }

    await prisma.category.update({
      where: { id: category.id },
      data: { explanation: file.content },
    });

    updatedCount++;
  }

  console.log(
    `   ✓ Inlined ${updatedCount} explanations onto categories for dataset ${dataset}`
  );
}

async function seedSubcategoryExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  const subcategoryFiles = readExplanationFilesFromDir(
    dataset,
    "subcategories"
  );

  if (subcategoryFiles.length === 0) {
    console.log("   ✓ No subcategory explanation files to seed.");
    return;
  }

  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: true,
    },
  });

  const subcategoryLookup = new Map(
    subcategories.map((sub) => [
      `${sub.category.position}:${normalizeName(sub.name)}`,
      sub,
    ])
  );

  let updatedCount = 0;

  for (const file of subcategoryFiles) {
    const lookupKey = `${file.categoryPosition}:${file.normalizedName}`;
    const subcategory = subcategoryLookup.get(lookupKey);

    if (!subcategory) {
      console.warn(
        `   ⚠ No subcategory match for file '${file.fileName}' (lookup key: ${lookupKey})`
      );
      continue;
    }

    await prisma.subcategory.update({
      where: { id: subcategory.id },
      data: { explanation: file.content },
    });

    updatedCount++;
  }

  console.log(
    `   ✓ Inlined ${updatedCount} explanations onto subcategories for dataset ${dataset}`
  );
}

async function seedStandaloneExplanations(prisma: PrismaClient) {
  let upsertedCount = 0;

  for (const [slug, entry] of Object.entries(EXPLANATION_CATALOG)) {
    await prisma.explanation.upsert({
      where: { slug },
      create: {
        slug,
        name: entry.name,
        description: entry.description ?? null,
        content: "",
      },
      update: {
        name: entry.name,
        description: entry.description ?? null,
      },
    });
    upsertedCount++;
  }

  console.log(`   ✓ Upserted ${upsertedCount} standalone explanation rows`);
}

export async function seedExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding explanations...");

  await seedStandaloneExplanations(prisma);
  await seedCategoryExplanations(prisma, dataset);
  await seedSubcategoryExplanations(prisma, dataset);
}
