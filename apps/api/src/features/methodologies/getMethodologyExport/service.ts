import { MethodologyVersionStatus, type PrismaClient } from "@repo/database";
import type { GetMethodologyExportResponse } from "@repo/types";
import { MethodologyNotFoundError } from "../errors.js";
import { findMethodologyExportByVersionId } from "../helpers.js";
import { mapMethodologyExportToResponse } from "../mappers.js";

// TODO: the counterpart of this export — a bulk / atomic import of a year's set
// — was deferred, and the year makes it the highest-value deferred item. With
// no undated factor, the whole catalogue (~284 rows, the ~86 IPCC and academic
// ones included) has to be restated every year, and today that is one grid row
// at a time in the maintainer. Until it exists, a half-loaded set drips into
// capture as it is typed, which is an accepted risk rather than a designed one.
// The 2026 set (issue 651) sidesteps it by arriving as seed data plus a script.
export const getMethodologyExportService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetMethodologyExportResponse> => {
  const methodology = await findMethodologyExportByVersionId(prismaClient, {
    id: BigInt(id),
    status: {
      in: [
        MethodologyVersionStatus.PUBLISHED,
        MethodologyVersionStatus.UNPUBLISHED,
      ],
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError();
  }

  return mapMethodologyExportToResponse(methodology);
};
