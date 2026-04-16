import type { PrismaClient } from "@repo/database";
import {
  SubmissionStatus,
  SubmissionType,
  InventoryStatus,
  OrganizationStatus,
  ReductionProjectStatus,
} from "@repo/database/enums";
import type { GetTransparencyDataResponse } from "@repo/types";

const RECOGNITION_TYPES: SubmissionType[] = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PROJECT_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
];

const APPROVED_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.APPROVED,
  SubmissionStatus.APPROVED_AUTOMATICALLY,
];

const submissionsSelect = {
  select: {
    subject: {
      select: {
        submissions: {
          where: {
            status: { in: APPROVED_STATUSES },
            type: { in: RECOGNITION_TYPES },
          },
          select: { type: true },
        },
      },
    },
  },
} as const;

export const getTransparencyDataService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetTransparencyDataResponse> => {
  const organizations = await prismaClient.organizationSummaryView.findMany({
    where: {
      isAccredited: true,
      organizationStatus: OrganizationStatus.ACTIVE,
    },
    select: {
      organizationId: true,
      name: true,
      organizationData: {
        select: {
          sector: { select: { name: true } },
          subsector: { select: { name: true } },
        },
      },
      organization: {
        select: {
          carbonInventories: {
            where: {
              status: InventoryStatus.ACTIVE,
              ...(year ? { year } : {}),
            },
            select: {
              year: true,
              submission: submissionsSelect,
            },
          },
          reductionProjects: {
            where: { status: ReductionProjectStatus.ACTIVE },
            select: {
              submission: submissionsSelect,
            },
          },
        },
      },
    },
  });

  const result: GetTransparencyDataResponse = [];

  for (const org of organizations) {
    const recognitionSet = new Set<SubmissionType>();
    const years = new Set<number>();

    for (const inventory of org.organization.carbonInventories) {
      const submissions = inventory.submission?.subject.submissions ?? [];

      for (const s of submissions) {
        recognitionSet.add(s.type);
      }

      if (submissions.length > 0 && inventory.year != null) {
        years.add(inventory.year);
      }
    }

    for (const project of org.organization.reductionProjects) {
      const submissions = project.submission?.subject.submissions ?? [];

      for (const s of submissions) {
        recognitionSet.add(s.type);
      }
    }

    if (recognitionSet.size === 0) continue;

    result.push({
      organizationId: String(org.organizationId),
      organizationName: org.name,
      sectorName: org.organizationData.sector?.name ?? null,
      subsectorName: org.organizationData.subsector?.name ?? null,
      recognitions: {
        CARBON_INVENTORY_CALCULATION: recognitionSet.has(
          SubmissionType.CARBON_INVENTORY_CALCULATION
        ),
        CARBON_INVENTORY_VERIFICATION: recognitionSet.has(
          SubmissionType.CARBON_INVENTORY_VERIFICATION
        ),
        REDUCTION_PROJECT_VERIFICATION: recognitionSet.has(
          SubmissionType.REDUCTION_PROJECT_VERIFICATION
        ),
        NEUTRALIZATION_PLAN_VERIFICATION: recognitionSet.has(
          SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION
        ),
      },
      years: [...years].sort((a, b) => b - a),
    });
  }

  result.sort((a, b) => a.organizationName.localeCompare(b.organizationName));

  return result;
};
