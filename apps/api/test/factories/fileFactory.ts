import {
  type Badge,
  type File,
  type SubmissionFile,
  type PrismaClient,
  BadgeStatus,
  BadgeType,
  FileStatus,
  SubmissionFileType,
} from "@repo/database";
import { randomUUID } from "crypto";

// ─── Low-level primitives ────────────────────────────────────────────────────

export async function createTestFile(
  prisma: PrismaClient,
  userId: bigint,
  overrides?: Partial<File>
): Promise<File> {
  return await prisma.file.create({
    data: {
      uuid: randomUUID(),
      originalName: "test-file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      blobPath: `test/path/${randomUUID()}-test-file.pdf`,
      createdById: userId,
      status: FileStatus.ACTIVE,
      ...overrides,
    },
  });
}

// ─── Composed factories (File + association) ─────────────────────────────────

/**
 * Creates a File record and links it to an existing Submission via SubmissionFile.
 * Returns both the created file and the submission-file join record.
 */
export async function createTestFileForSubmission(
  prisma: PrismaClient,
  userId: bigint,
  submissionId: bigint,
  options?: {
    type?: SubmissionFileType;
    fileOverrides?: Partial<File>;
  }
): Promise<{ file: File; submissionFile: SubmissionFile }> {
  const file = await createTestFile(prisma, userId, options?.fileOverrides);

  const submissionFile = await prisma.submissionFile.create({
    data: {
      fileId: file.id,
      submissionId,
      type: options?.type ?? SubmissionFileType.SUBMIT_ATTACHMENT,
    },
  });

  return { file, submissionFile };
}

/**
 * Creates a File record and links it to a new Badge of the given type.
 * Any previously ACTIVE badge of the same type is NOT deactivated here —
 * that logic lives in the production service. Use overrides to set INACTIVE
 * when you want to test coexistence of multiple badge records.
 */
export async function createTestFileForBadge(
  prisma: PrismaClient,
  userId: bigint,
  type: BadgeType,
  options?: {
    badgeOverrides?: Partial<Badge>;
    fileOverrides?: Partial<File>;
  }
): Promise<{ file: File; badge: Badge }> {
  const file = await createTestFile(prisma, userId, options?.fileOverrides);

  const badge = await prisma.badge.create({
    data: {
      fileId: file.id,
      type,
      status: BadgeStatus.ACTIVE,
      ...options?.badgeOverrides,
    },
  });

  return { file, badge };
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Cleans up all file-related test data.
 * Must be called BEFORE cleanupTestOrganization to avoid FK violations,
 * since SubmissionFile records reference Submission records.
 */
export async function cleanupTestFiles(prisma: PrismaClient): Promise<void> {
  await prisma.submissionFile.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.file.deleteMany();
}
