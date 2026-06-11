import { type PrismaClient } from "@repo/database";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { generateSeedDataPath, type SeedsDataset } from "@/utils/index.js";

const StandaloneExplanationsSchema = z.array(
  z.object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    content: z.string().optional(),
  })
);

function readStandaloneContentMarkdown(
  dataset: SeedsDataset,
  slug: string
): string | null {
  const filePath = join(
    __dirname,
    `../data/${dataset}/explanations/standalone/${slug}.md`
  );
  try {
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

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

async function seedStandaloneExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  const filePath = generateSeedDataPath(
    __dirname,
    "standalone_explanations.json",
    dataset
  );

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.log(
        `   ⚠ No standalone_explanations.json found for dataset ${dataset}, skipping.`
      );
      return;
    }
    throw error;
  }

  const entries = StandaloneExplanationsSchema.parse(JSON.parse(raw));

  let mdOverrideCount = 0;

  for (const entry of entries) {
    const markdownContent = readStandaloneContentMarkdown(dataset, entry.slug);
    const content = markdownContent ?? entry.content ?? "";
    if (markdownContent !== null) mdOverrideCount++;

    await prisma.explanation.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        name: entry.name,
        description: entry.description ?? null,
        content,
      },
      update: {
        name: entry.name,
        description: entry.description ?? null,
        content,
      },
    });
  }

  console.log(
    `   ✓ Seeded ${entries.length} standalone explanation rows ` +
      `(${mdOverrideCount} with markdown content from .md files)`
  );
}

export async function seedExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding explanations...");

  await seedStandaloneExplanations(prisma, dataset);
  await seedCategoryExplanations(prisma, dataset);
  await seedSubcategoryExplanations(prisma, dataset);
}
