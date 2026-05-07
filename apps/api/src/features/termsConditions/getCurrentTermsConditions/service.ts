import type { PrismaClient } from "@repo/database";
import {
  FileStatus,
  type GetCurrentTermsConditionsResponse,
  SystemParameterKeyEnum,
} from "@repo/types";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";

// Returned when there is no current Terms & Conditions to expose to the
// landing page. Used both when the SystemParameter is unset and when the
// File row it points to has been soft-deleted.
const EMPTY_RESPONSE: GetCurrentTermsConditionsResponse = {
  fileName: null,
};

/**
 * Returns metadata about the current Terms & Conditions PDF, or `fileName: null`
 * if no current T&C exists.
 *
 * The PDF itself is served by a separate streaming endpoint
 * (GET /api/terms-conditions/file) so the link the landing page renders has a
 * stable URL that does not depend on a short-lived signed URL.
 *
 * This endpoint exists only to let the landing page decide whether to render
 * the link at all (graceful UX when the platform is freshly deployed and the
 * T&C has not been seeded yet).
 */
export const getCurrentTermsConditionsService = async (
  prisma: PrismaClient
): Promise<GetCurrentTermsConditionsResponse> => {
  // Source of truth for "the current T&C": a SystemParameter row that an
  // admin update flips when a new PDF is uploaded via /api/files/legal/*.
  const fileUuid = await getSystemParameterValue(
    prisma,
    SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID
  );

  if (!fileUuid) return EMPTY_RESPONSE;

  // Defensive: the SystemParameter could point at a File that has since been
  // soft-deleted. Treat that as "no current T&C" rather than 500ing.
  const file = await prisma.file.findUnique({
    where: { uuid: fileUuid, status: FileStatus.ACTIVE },
    select: { originalName: true },
  });

  if (!file) return EMPTY_RESPONSE;

  return { fileName: file.originalName };
};
