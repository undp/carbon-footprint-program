import { type PrismaClient } from "@/index.js";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type SeedsDataset } from "@/prisma/seeds/utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Normalizes a name to match the filename convention:
 * lowercase, spaces → underscores, strips accents, removes special chars except underscores.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "_") // collapse non-alphanumeric runs into single underscore
    .replace(/^_|_$/g, ""); // trim leading/trailing underscores
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
    // Parse filename: c{position}_{normalized_name}.md
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

  let linkedCount = 0;

  for (const file of categoryFiles) {
    const lookupKey = `${file.categoryPosition}:${file.normalizedName}`;
    const category = categoryLookup.get(lookupKey);

    if (!category) {
      console.warn(
        `   ⚠ No category match for file '${file.fileName}' (lookup key: ${lookupKey})`
      );
      continue;
    }

    const slug = `cat_${file.categoryPosition}_${file.normalizedName}`;

    await prisma.explanation.create({
      data: {
        slug,
        content: file.content,
      },
    });

    await prisma.category.update({
      where: { id: category.id },
      data: { explanationSlug: slug },
    });

    linkedCount++;
  }

  console.log(
    `   ✓ Created ${linkedCount} explanations and linked to categories for dataset ${dataset}`
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

  let linkedCount = 0;

  for (const file of subcategoryFiles) {
    const lookupKey = `${file.categoryPosition}:${file.normalizedName}`;
    const subcategory = subcategoryLookup.get(lookupKey);

    if (!subcategory) {
      console.warn(
        `   ⚠ No subcategory match for file '${file.fileName}' (lookup key: ${lookupKey})`
      );
      continue;
    }

    const slug = `sub_${file.categoryPosition}_${file.normalizedName}`;

    await prisma.explanation.create({
      data: {
        slug,
        content: file.content,
      },
    });

    await prisma.subcategory.update({
      where: { id: subcategory.id },
      data: { explanationSlug: slug },
    });

    linkedCount++;
  }

  console.log(
    `   ✓ Created ${linkedCount} explanations and linked to subcategories for dataset ${dataset}`
  );
}

export async function seedExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding explanations...");

  await seedCategoryExplanations(prisma, dataset);
  await seedSubcategoryExplanations(prisma, dataset);
}
