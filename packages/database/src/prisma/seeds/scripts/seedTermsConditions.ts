import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import {
  LEGAL_BLOB_PREFIX,
  LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
  LEGAL_TERMS_CONDITIONS_GROUP_KEY,
} from "@repo/constants";
import { FileStatus, type PrismaClient } from "../../../index.js";
import type { SeedsDataset } from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TERMS_CONDITIONS_FILE_NAME = "terms_conditions.pdf";
const TERMS_CONDITIONS_SYSTEM_PARAMETER_KEY = "TERMS_CONDITIONS_FILE_UUID";

function buildLegalBlobPath(uuid: string, name: string): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${LEGAL_BLOB_PREFIX}/${LEGAL_TERMS_CONDITIONS_GROUP_KEY}/${uuid}-${sanitizedName}`;
}

export async function seedTermsConditions(
  prisma: PrismaClient,
  dataset: SeedsDataset
): Promise<void> {
  if (dataset !== "base") {
    console.log("⟳ Skipping terms & conditions seeding for non-base dataset");
    return;
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    console.warn(
      "⚠ AZURE_STORAGE_ACCOUNT_NAME not set — skipping terms & conditions seeding"
    );
    return;
  }

  console.log("Seeding terms & conditions...");

  const currentParam = await prisma.systemParameter.findUnique({
    where: { key: TERMS_CONDITIONS_SYSTEM_PARAMETER_KEY },
    select: { value: true },
  });

  if (currentParam?.value) {
    const existingFile = await prisma.file.findUnique({
      where: { uuid: currentParam.value, status: FileStatus.ACTIVE },
      select: { uuid: true },
    });
    if (existingFile) {
      console.log("  ⟳ Terms & conditions already seeded — skipping");
      return;
    }
  }

  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "files";
  const containerClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential()
  ).getContainerClient(containerName);

  const filePath = join(__dirname, "../data/legal", TERMS_CONDITIONS_FILE_NAME);
  const fileBuffer = readFileSync(filePath);
  const sizeBytes = fileBuffer.byteLength;
  const uuid = randomUUID();
  const blobPath = buildLegalBlobPath(uuid, TERMS_CONDITIONS_FILE_NAME);

  await containerClient.getBlockBlobClient(blobPath).uploadData(fileBuffer, {
    blobHTTPHeaders: {
      blobContentType: LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.file.create({
        data: {
          uuid,
          originalName: TERMS_CONDITIONS_FILE_NAME,
          mimeType: LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
          sizeBytes,
          blobPath,
          status: FileStatus.ACTIVE,
        },
      });

      await tx.systemParameter.update({
        where: { key: TERMS_CONDITIONS_SYSTEM_PARAMETER_KEY },
        data: { value: uuid },
      });
    });
  } catch (err) {
    await containerClient.getBlockBlobClient(blobPath).deleteIfExists();
    throw err;
  }

  console.log(`  ✓ Terms & conditions (${TERMS_CONDITIONS_FILE_NAME})`);
  console.log("✓ Terms & conditions seeded");
}
