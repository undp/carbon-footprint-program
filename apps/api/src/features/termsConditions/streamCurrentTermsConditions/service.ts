import type { PrismaClient } from "@repo/database";
import { FileStatus, SystemParameterKeyEnum } from "@repo/types";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";

export interface CurrentTermsConditionsBlob {
  blobPath: string;
  mimeType: string;
  originalName: string;
}

/**
 * Resolves the current Terms & Conditions File row (if any) and returns the
 * blob coordinates the streaming handler needs to fetch the PDF from object
 * storage.
 *
 * Returns `null` when no current T&C is set OR when the SystemParameter
 * points at a File that has since been soft-deleted — both should produce a
 * 404 from the streaming endpoint.
 */
export const resolveCurrentTermsConditionsBlob = async (
  prisma: PrismaClient
): Promise<CurrentTermsConditionsBlob | null> => {
  const fileUuid = await getSystemParameterValue(
    prisma,
    SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID
  );
  if (!fileUuid) return null;

  const file = await prisma.file.findFirst({
    where: { uuid: fileUuid, status: FileStatus.ACTIVE },
    select: { blobPath: true, mimeType: true, originalName: true },
  });
  if (!file) return null;

  return file;
};
