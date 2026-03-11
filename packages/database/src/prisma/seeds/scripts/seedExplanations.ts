import { type PrismaClient } from "@/index.js";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type SeedsDataset } from "@/prisma/seeds/utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Normalizes a subcategory name to match the filename convention:
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
  normalizedSubcategoryName: string;
  content: string;
}

function readExplanationFiles(dataset: SeedsDataset): ExplanationFile[] {
  const explanationsDir = join(__dirname, `../data/${dataset}/explanations`);

  let files: string[];
  try {
    files = readdirSync(explanationsDir).filter((f) => f.endsWith(".md"));
  } catch {
    console.log(
      `   ⚠ No explanations directory found for dataset ${dataset}, skipping.`
    );
    return [];
  }

  return files.map((fileName) => {
    // Parse filename: c{position}_{normalized_subcategory_name}.md
    const match = fileName.match(/^c(\d+)_(.+)\.md$/);
    if (!match) {
      throw new Error(
        `Invalid explanation filename format: '${fileName}'. Expected c{position}_{name}.md`
      );
    }

    const categoryPosition = parseInt(match[1]!, 10);
    const normalizedSubcategoryName = normalizeName(match[2]!);
    const content = readFileSync(join(explanationsDir, fileName), "utf-8");

    return {
      fileName,
      categoryPosition,
      normalizedSubcategoryName,
      content,
    };
  });
}

export async function seedExplanations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding explanations...");

  const explanationFiles = readExplanationFiles(dataset);

  if (explanationFiles.length === 0) {
    console.log("   ✓ No explanation files to seed.");
    return;
  }

  // Fetch all subcategories with their parent category (which has position)
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: true,
    },
  });

  // Build a lookup: "categoryPosition:normalizedSubcategoryName" → subcategory
  const subcategoryLookup = new Map(
    subcategories.map((sub) => [
      `${sub.category.position}:${normalizeName(sub.name)}`,
      sub,
    ])
  );

  let linkedCount = 0;

  for (const file of explanationFiles) {
    const lookupKey = `${file.categoryPosition}:${file.normalizedSubcategoryName}`;
    const subcategory = subcategoryLookup.get(lookupKey);

    if (!subcategory) {
      console.warn(
        `   ⚠ No subcategory match for file '${file.fileName}' (lookup key: ${lookupKey})`
      );
      continue;
    }

    // Use the original subcategory name as the explanation name
    const explanationName = `Explicación de la subcategoría ${subcategory.name}`;

    // Upsert: create explanation if it doesn't exist, then link to subcategory
    const explanation = await prisma.explanation.create({
      data: {
        name: explanationName,
        content: file.content,
      },
    });

    // Link subcategory to the explanation
    await prisma.subcategory.update({
      where: { id: subcategory.id },
      data: { explanationId: explanation.id },
    });

    linkedCount++;
  }

  console.log(
    `   ✓ Created ${linkedCount} explanations and linked to subcategories for dataset ${dataset}`
  );
}
