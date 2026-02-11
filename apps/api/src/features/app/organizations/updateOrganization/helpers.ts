import {
  OrganizationData,
  Prisma,
  SubmissionStatus,
  SubmissionSubjectType,
} from "@repo/database";
import { UpdateOrganizationRequest } from "@repo/types";
import { mapBigIntField } from "@/utils/bigint.js";
import { SubmissionAlreadyExistsError } from "../errors.js";

/**
 * Builds data for creating a new OrganizationData record.
 * Merges with the most recent organization_data if available.
 */
export async function buildOrganizationDataForCreate(
  tx: Prisma.TransactionClient,
  organizationId: string,
  data: UpdateOrganizationRequest
): Promise<Prisma.OrganizationDataUncheckedCreateInput> {
  const orgId = BigInt(organizationId);

  // Find most recent organization_data to use as base
  const existingData = await tx.organizationData.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  // Extract fields from existing data (if any)
  const baseData = existingData ? extractDataFields(existingData) : {};

  // Merge with provided updates
  return {
    ...baseData,
    ...buildOrganizationDataForUpdate(data),
    organizationId: orgId,
  } as Prisma.OrganizationDataUncheckedCreateInput;
}

/**
 * Builds data for updating an existing OrganizationData record.
 * Only includes fields that were provided in the request.
 */
export function buildOrganizationDataForUpdate(
  data: UpdateOrganizationRequest
): Prisma.OrganizationDataUncheckedUpdateInput {
  const updateData: Prisma.OrganizationDataUncheckedUpdateInput = {};

  // String fields
  if (data.legalName !== undefined) updateData.legalName = data.legalName;
  if (data.tradeName !== undefined) updateData.tradeName = data.tradeName;
  if (data.taxId !== undefined) updateData.taxId = data.taxId;
  if (data.address !== undefined) updateData.address = data.address;

  // Number fields
  if (data.workersCount !== undefined)
    updateData.workersCount = data.workersCount;

  // Representative fields
  if (data.representativeFullName !== undefined)
    updateData.representativeFullName = data.representativeFullName;
  if (data.representativeTaxId !== undefined)
    updateData.representativeTaxId = data.representativeTaxId;
  if (data.representativePhone !== undefined)
    updateData.representativePhone = data.representativePhone;
  if (data.representativeEmail !== undefined)
    updateData.representativeEmail = data.representativeEmail;

  // BigInt fields (using mapper utility)
  const countryOrganizationSizeId = mapBigIntField(
    data.countryOrganizationSizeId
  );
  if (countryOrganizationSizeId !== undefined)
    updateData.countryOrganizationSizeId = countryOrganizationSizeId;

  const sectorId = mapBigIntField(data.sectorId);
  if (sectorId !== undefined) updateData.sectorId = sectorId;

  const subsectorId = mapBigIntField(data.subsectorId);
  if (subsectorId !== undefined) updateData.subsectorId = subsectorId;

  const representativeCountryJobPositionId = mapBigIntField(
    data.representativeCountryJobPositionId
  );
  if (representativeCountryJobPositionId !== undefined)
    updateData.representativeCountryJobPositionId =
      representativeCountryJobPositionId;

  return updateData;
}

/**
 * Extracts data fields from an existing OrganizationData record.
 * Excludes metadata fields like id, timestamps, etc.
 */
function extractDataFields(
  orgData: OrganizationData
): Partial<Prisma.OrganizationDataUncheckedCreateInput> {
  return {
    legalName: orgData.legalName,
    tradeName: orgData.tradeName,
    taxId: orgData.taxId,
    countryOrganizationSizeId: orgData.countryOrganizationSizeId,
    sectorId: orgData.sectorId,
    subsectorId: orgData.subsectorId,
    address: orgData.address,
    workersCount: orgData.workersCount,
    representativeFullName: orgData.representativeFullName,
    representativeTaxId: orgData.representativeTaxId,
    representativeCountryJobPositionId:
      orgData.representativeCountryJobPositionId,
    representativePhone: orgData.representativePhone,
    representativeEmail: orgData.representativeEmail,
  };
}

/**
 * Creates submission workflow for organization_data.
 * Reuses SubmissionSubject from previous REJECTED submission if available.
 * Based on submitAccreditationRequest service logic.
 */
export async function createSubmissionWorkflow(
  tx: Prisma.TransactionClient,
  organizationDataId: bigint
): Promise<void> {
  // Check if SubmissionSubject already exists for this organizationData
  const existingSubject = await tx.submissionSubjectOrganizationData.findUnique(
    {
      where: { organizationDataId },
      include: {
        subject: {
          include: {
            submissions: {
              where: {
                status: {
                  in: [SubmissionStatus.PENDING, SubmissionStatus.APPROVED],
                },
              },
            },
          },
        },
      },
    }
  );

  // Check for active submission conflict
  if (existingSubject && existingSubject.subject.submissions.length > 0) {
    throw new SubmissionAlreadyExistsError(organizationDataId.toString());
  }

  // Create new SubmissionSubject
  const newSubject = await tx.submissionSubject.create({
    data: {
      subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
      createdById: null,
      organizationData: {
        create: { organizationDataId },
      },
    },
  });

  // Create Submission with PENDING status
  await tx.submission.create({
    data: {
      subjectId: newSubject.id,
      status: SubmissionStatus.PENDING,
      createdById: null,
    },
  });
}
