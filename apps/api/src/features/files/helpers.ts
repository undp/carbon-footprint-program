import type { PrismaClient, Prisma } from "@repo/database";
import { FileType } from "@repo/types";
import { FileTypeNotFoundError } from "./errors.js";

export async function validateFileTypeExists(
  prisma: PrismaClient,
  fileType: FileType,
  ownerId: bigint
): Promise<void> {
  if (fileType === FileType.ORGANIZATION_DATA_ATTACHMENT) {
    const data = await prisma.organizationData.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!data)
      throw new FileTypeNotFoundError("Organization data", ownerId.toString());
  } else if (fileType === FileType.CARBON_INVENTORY_ATTACHMENT) {
    const inventory = await prisma.carbonInventory.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!inventory)
      throw new FileTypeNotFoundError("Carbon inventory", ownerId.toString());
  } else if (fileType === FileType.CARBON_INVENTORY_LINE_INPUT_ATTACHMENT) {
    const line = await prisma.carbonInventoryLine.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!line)
      throw new FileTypeNotFoundError(
        "Carbon inventory line",
        ownerId.toString()
      );
  } else if (fileType === FileType.SUBMISSION_ATTACHMENT) {
    const submission = await prisma.submission.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });
    if (!submission)
      throw new FileTypeNotFoundError("Submission", ownerId.toString());
  } else {
    throw new Error(`Unknown file type: ${String(fileType)}`);
  }
}

export async function createFileLink(
  tx: Prisma.TransactionClient,
  fileType: FileType,
  fileId: bigint,
  ownerId: bigint
): Promise<void> {
  if (fileType === FileType.ORGANIZATION_DATA_ATTACHMENT) {
    await tx.organizationDataFile.create({
      data: { fileId, organizationDataId: ownerId },
    });
  } else if (fileType === FileType.CARBON_INVENTORY_ATTACHMENT) {
    await tx.carbonInventoryFile.create({
      data: { fileId, carbonInventoryId: ownerId },
    });
  } else if (fileType === FileType.CARBON_INVENTORY_LINE_INPUT_ATTACHMENT) {
    await tx.carbonInventoryLineFile.create({
      data: { fileId, carbonInventoryLineId: ownerId },
    });
  } else if (fileType === FileType.SUBMISSION_ATTACHMENT) {
    await tx.submissionFile.create({
      data: { fileId, submissionId: ownerId },
    });
  } else {
    throw new Error(`Unknown file type: ${String(fileType)}`);
  }
}

export async function findFileIdsByType(
  prisma: PrismaClient,
  fileType: FileType,
  ownerId: bigint
): Promise<bigint[]> {
  if (fileType === FileType.ORGANIZATION_DATA_ATTACHMENT) {
    const links = await prisma.organizationDataFile.findMany({
      where: { organizationDataId: ownerId },
      select: { fileId: true },
    });
    return links.map((l) => l.fileId);
  } else if (fileType === FileType.CARBON_INVENTORY_ATTACHMENT) {
    const links = await prisma.carbonInventoryFile.findMany({
      where: { carbonInventoryId: ownerId },
      select: { fileId: true },
    });
    return links.map((l) => l.fileId);
  } else if (fileType === FileType.CARBON_INVENTORY_LINE_INPUT_ATTACHMENT) {
    const links = await prisma.carbonInventoryLineFile.findMany({
      where: { carbonInventoryLineId: ownerId },
      select: { fileId: true },
    });
    return links.map((l) => l.fileId);
  } else if (fileType === FileType.SUBMISSION_ATTACHMENT) {
    const links = await prisma.submissionFile.findMany({
      where: { submissionId: ownerId },
      select: { fileId: true },
    });
    return links.map((l) => l.fileId);
  } else {
    throw new Error(`Unknown file type: ${String(fileType)}`);
  }
}
