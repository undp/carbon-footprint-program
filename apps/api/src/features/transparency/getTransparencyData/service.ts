import type { PrismaClient } from "@repo/database";
import {
  SubmissionStatus,
  InventoryStatus,
  OrganizationStatus,
  ReductionProjectStatus,
} from "@repo/database/enums";
import { flatMap, orderBy } from "lodash-es";
import {
  RECOGNITION_SUBMISSION_TYPES,
  CarbonInventoryRecognitionsType,
  GetTransparencyDataResponse,
} from "@repo/types";

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
            type: { in: RECOGNITION_SUBMISSION_TYPES },
          },
          select: { type: true },
        },
      },
    },
  },
} as const;

type TransparencyRow = GetTransparencyDataResponse[number];

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
              reductionProjects: {
                where: { status: ReductionProjectStatus.ACTIVE },
                select: {
                  year: true,
                  submission: submissionsSelect,
                },
              },
            },
          },
        },
      },
    },
  });

  const rows = flatMap(organizations, (org) =>
    flatMap(
      org.organization.carbonInventories,
      (inventory): TransparencyRow[] => {
        if (inventory.year == null) return [];

        const recognitionSet = new Set<CarbonInventoryRecognitionsType>();

        for (const s of inventory.submission?.subject.submissions ?? []) {
          recognitionSet.add(s.type as CarbonInventoryRecognitionsType);
        }

        for (const project of inventory.reductionProjects) {
          if (project.year !== inventory.year) continue;
          for (const s of project.submission?.subject.submissions ?? []) {
            recognitionSet.add(s.type as CarbonInventoryRecognitionsType);
          }
        }

        if (recognitionSet.size === 0) return [];

        const recognitions = Object.fromEntries(
          RECOGNITION_SUBMISSION_TYPES.map((t) => [t, recognitionSet.has(t)])
        ) as TransparencyRow["recognitions"];

        return [
          {
            organizationId: String(org.organizationId),
            organizationName: org.name,
            sectorName: org.organizationData.sector?.name ?? null,
            subsectorName: org.organizationData.subsector?.name ?? null,
            recognitions,
            year: inventory.year,
          },
        ];
      }
    )
  );

  return orderBy(
    rows,
    [
      "year",
      (row) => Object.values(row.recognitions).filter(Boolean).length,
      "organizationName",
    ],
    ["desc", "desc", "asc"]
  );
};
