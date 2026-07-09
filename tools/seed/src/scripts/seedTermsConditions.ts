import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import {
  LEGAL_BLOB_PREFIX,
  LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
  LEGAL_TERMS_CONDITIONS_GROUP_KEY,
} from "@repo/constants";
import { FileStatus, type PrismaClient } from "@repo/database";
import {
  createStorageAdapter,
  storageConfigFromEnv,
  type StorageAdapter,
} from "@repo/storage";
import { SystemParameterKeyEnum } from "@repo/types";
import type { SeedsDataset } from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TERMS_CONDITIONS_FILE_NAME = "terms_conditions.pdf";

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

  let storage: StorageAdapter;
  try {
    storage = await createStorageAdapter(storageConfigFromEnv(process.env));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `⚠ Object storage not configured — skipping terms & conditions seeding (${reason})`
    );
    return;
  }

  console.log("Seeding terms & conditions...");

  const currentParam = await prisma.systemParameter.findUnique({
    where: { key: SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID },
    select: { value: true },
  });

  if (currentParam?.value) {
    const existingFile = await prisma.file.findFirst({
      where: { uuid: currentParam.value, status: FileStatus.ACTIVE },
      select: { uuid: true },
    });
    if (existingFile) {
      console.log("  ⟳ Terms & conditions already seeded — skipping");
      return;
    }
  }

  const filePath = join(__dirname, "../data/legal", TERMS_CONDITIONS_FILE_NAME);
  const fileBuffer = readFileSync(filePath);
  const sizeBytes = fileBuffer.byteLength;
  const uuid = randomUUID();
  const blobPath = buildLegalBlobPath(uuid, TERMS_CONDITIONS_FILE_NAME);

  await storage.putObject(blobPath, fileBuffer, {
    contentType: LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
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
        where: { key: SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID },
        data: { value: uuid },
      });
    });
  } catch (err) {
    await storage.deleteObject(blobPath);
    throw err;
  }

  console.log(`  ✓ Terms & conditions (${TERMS_CONDITIONS_FILE_NAME})`);
  console.log("✓ Terms & conditions seeded");
}
