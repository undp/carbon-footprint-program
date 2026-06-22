import { OrganizationStatus, PrismaClient } from "@repo/database";
import {
  SubmissionType,
  GetOrganizationRecognitionsResponse,
  CARBON_INVENTORY_RECOGNITION_SUBMISSION_TYPES,
  REDUCTION_PROJECT_RECOGNITION_SUBMISSION_TYPES,
} from "@repo/types";
import { intersection } from "lodash-es";

import { OrganizationNotFoundError } from "../../errors.js";
import {
  fetchCarbonInventoryRecognitions,
  fetchReductionProjectRecognitions,
} from "./helpers.js";
import type { StorageAdapter } from "@repo/storage";

const SUBMISSION_TYPE_ORDER: Record<SubmissionType, number> = {
  [SubmissionType.CARBON_INVENTORY_CALCULATION]: 0,
  [SubmissionType.CARBON_INVENTORY_VERIFICATION]: 1,
  [SubmissionType.REDUCTION_PROJECT_VERIFICATION]: 2,
  [SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION]: 3,
  [SubmissionType.ORGANIZATION_ACCREDITATION]: 4,
};

export const getOrganizationRecognitionsService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  storage: StorageAdapter,
  year?: string,
  submissionTypes?: SubmissionType[]
): Promise<GetOrganizationRecognitionsResponse> => {
  const org = await prismaClient.organization.findUnique({
    where: { id: BigInt(organizationId), status: OrganizationStatus.ACTIVE },
    select: { id: true },
  });

  if (!org) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const yearFilter = year ? parseInt(year, 10) : undefined;
  const orgId = BigInt(organizationId);

  const requestedCarbonInventorySubmissionTypes = submissionTypes
    ? intersection(
        submissionTypes,
        CARBON_INVENTORY_RECOGNITION_SUBMISSION_TYPES
      )
    : CARBON_INVENTORY_RECOGNITION_SUBMISSION_TYPES;

  const requestedReductionProjectSubmissionTypes = submissionTypes
    ? intersection(
        submissionTypes,
        REDUCTION_PROJECT_RECOGNITION_SUBMISSION_TYPES
      )
    : REDUCTION_PROJECT_RECOGNITION_SUBMISSION_TYPES;

  const [carbonInventoryRecognitions, reductionProjectRecognitions] =
    await Promise.all([
      fetchCarbonInventoryRecognitions(
        prismaClient,
        orgId,
        yearFilter,
        requestedCarbonInventorySubmissionTypes,
        storage
      ),
      fetchReductionProjectRecognitions(
        prismaClient,
        orgId,
        yearFilter,
        requestedReductionProjectSubmissionTypes,
        storage
      ),
    ]);

  return [...carbonInventoryRecognitions, ...reductionProjectRecognitions].sort(
    (a, b) =>
      b.measurementYear - a.measurementYear ||
      SUBMISSION_TYPE_ORDER[b.submissionType] -
        SUBMISSION_TYPE_ORDER[a.submissionType]
  );
};
