import {
  OrganizationDataStatus,
  OrganizationStatus,
  PrismaClient,
} from "@repo/database";
import {
  UpdateOrganizationRequest,
  UpdateOrganizationResponse,
} from "@repo/types";
import {
  InvalidOrganizationStateError,
  OrganizationNotFoundError,
} from "../errors.js";
import {
  buildOrganizationDataForCreate,
  buildOrganizationDataForUpdate,
  createSubmissionWorkflow,
} from "./helpers.js";

export const updateOrganizationService = async (
  prisma: PrismaClient,
  organizationId: string,
  data: UpdateOrganizationRequest
): Promise<UpdateOrganizationResponse> => {
  const orgId = BigInt(organizationId);

  return (await prisma.$transaction(async (tx) => {
    // ===== STEP 1: Validate organization exists =====
    const organization = await tx.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    // ===== STEP 2: Check for submitted data (conflict) =====
    const hasSubmittedData = await tx.organizationData.findFirst({
      where: {
        organizationId: orgId,
        status: OrganizationDataStatus.SUBMITTED,
      },
    });

    if (hasSubmittedData) {
      throw new InvalidOrganizationStateError(
        organizationId,
        "Organization has submitted data pending review"
      );
    }

    // ===== check if organization is blocked
    if (organization.status === OrganizationStatus.BLOCKED) {
      throw new InvalidOrganizationStateError(
        organizationId,
        "Organization is blocked"
      );
    }

    // ===== STEP 3: Route based on organization status =====

    // --- CASE A: ACCREDITED Organization ---
    // Always create new SUBMITTED organization_data and trigger approval workflow
    if (organization.status === OrganizationStatus.ACCREDITED) {
      const createData = await buildOrganizationDataForCreate(
        tx,
        organizationId,
        data
      );

      const newOrgData = await tx.organizationData.create({
        data: {
          ...createData,
          status: OrganizationDataStatus.SUBMITTED,
          createdById: null,
        },
        include: {
          countryOrganizationSize: true,
          sector: true,
          subsector: true,
          representativeCountryJobPosition: true,
        },
      });

      await createSubmissionWorkflow(tx, newOrgData.id);
      return {};
    }

    // --- CASE B: NOT_ACCREDITED Organization ---
    if (organization.status === OrganizationStatus.NOT_ACCREDITED) {
      // Check if DRAFT exists
      const draftData = await tx.organizationData.findFirst({
        where: {
          organizationId: orgId,
          status: OrganizationDataStatus.DRAFT,
        },
      });

      // CASE B.1: Has DRAFT → Update it
      if (draftData) {
        const updateData = buildOrganizationDataForUpdate(data);
        await tx.organizationData.update({
          where: { id: draftData.id },
          data: {
            ...updateData,
            updatedById: null,
          },
          include: {
            countryOrganizationSize: true,
            sector: true,
            subsector: true,
            representativeCountryJobPosition: true,
          },
        });
        return {};
      }

      // CASE B.2: No DRAFT (was REJECTED or no data) → Create new DRAFT
      const createData = await buildOrganizationDataForCreate(
        tx,
        organizationId,
        data
      );

      await tx.organizationData.create({
        data: {
          ...createData,
          status: OrganizationDataStatus.DRAFT,
          createdById: null,
        },
        include: {
          countryOrganizationSize: true,
          sector: true,
          subsector: true,
          representativeCountryJobPosition: true,
        },
      });

      return {};
    }

    return {};
  })) as UpdateOrganizationResponse;
};
