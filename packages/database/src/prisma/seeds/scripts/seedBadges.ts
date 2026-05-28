import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { BadgeStatus, BadgeType, type PrismaClient } from "../../../index.js";
import { getStorageCredential } from "../../../utils/getStorageCredential.js";
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
  return `BADGE/${badgeType}/${uuid}-${sanitizedName}`;
}

export async function seedBadges(
  prisma: PrismaClient,
  dataset: SeedsDataset
): Promise<void> {
  if (dataset !== "base") {
    console.log("⟳ Skipping badge seeding for non-base dataset");
    return;
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    console.warn(
      "⚠ AZURE_STORAGE_ACCOUNT_NAME not set — skipping badge seeding"
    );
    return;
  }

  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "files";
  const containerClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    getStorageCredential()
  ).getContainerClient(containerName);

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

    await containerClient.getBlockBlobClient(blobPath).uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: "image/svg+xml" },
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
      await containerClient.getBlockBlobClient(blobPath).deleteIfExists();
      throw err;
    }

    console.log(`  ✓ ${type} (${file})`);
    seeded++;
  }

  console.log(`✓ Badges: ${seeded} seeded, ${skipped} skipped`);
}
