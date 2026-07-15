import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { BadgeStatus, BadgeType, type PrismaClient } from "@repo/database";
import { type StorageAdapter } from "@repo/storage";
import { FileType } from "@repo/types";
import type { SeedsDataset } from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BADGE_MAPPINGS: Array<{ file: string; type: BadgeType }> = [
  {
    file: "calculation-badge.svg",
    type: BadgeType.CARBON_INVENTORY_CALCULATION,
  },
  {
    file: "verification-badge.svg",
    type: BadgeType.CARBON_INVENTORY_VERIFICATION,
  },
  {
    file: "reduction-badge.svg",
    type: BadgeType.REDUCTION_PROJECT_VERIFICATION,
  },
  {
    file: "neutralization-badge.svg",
    type: BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
  },
];

function buildBadgeBlobPath(
  badgeType: BadgeType,
  uuid: string,
  name: string
): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${FileType.BADGE}/${badgeType}/${uuid}-${sanitizedName}`;
}

export async function seedBadges(
  prisma: PrismaClient,
  dataset: SeedsDataset,
  storage: StorageAdapter | undefined
): Promise<void> {
  if (dataset !== "base") {
    console.log("⟳ Skipping badge seeding for non-base dataset");
    return;
  }

  if (!storage) {
    // Unreachable in practice: `main()` preflights object storage and injects a
    // ready adapter for the base dataset before calling this. Guard defensively
    // rather than silently skip (the bug this hardening removed).
    throw new Error(
      "seedBadges: the base dataset requires an object-storage adapter, but none was provided"
    );
  }

  const badgesDir = join(__dirname, "../data/badges");

  console.log("Seeding badges...");

  let seeded = 0;
  let skipped = 0;

  for (const { file, type } of BADGE_MAPPINGS) {
    const existing = await prisma.badge.findFirst({
      where: { type, status: BadgeStatus.ACTIVE },
    });

    if (existing) {
      console.log(`  ⟳ ${type} already exists — skipping`);
      skipped++;
      continue;
    }

    const filePath = join(badgesDir, file);
    const fileBuffer = readFileSync(filePath);
    const sizeBytes = fileBuffer.byteLength;
    const uuid = randomUUID();
    const blobPath = buildBadgeBlobPath(type, uuid, file);

    await storage.putObject(blobPath, fileBuffer, {
      contentType: "image/svg+xml",
    });

    try {
      await prisma.file.create({
        data: {
          uuid,
          originalName: file,
          mimeType: "image/svg+xml",
          sizeBytes,
          blobPath,
          badge: {
            create: {
              type,
              status: BadgeStatus.ACTIVE,
            },
          },
        },
      });
    } catch (err) {
      await storage.deleteObject(blobPath);
      throw err;
    }

    console.log(`  ✓ ${type} (${file})`);
    seeded++;
  }

  console.log(`✓ Badges: ${seeded} seeded, ${skipped} skipped`);
}
