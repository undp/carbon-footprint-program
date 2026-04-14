import { Prisma } from "@repo/database";
import type {
  GetAllReductionProjectsResponse,
  GetReductionProjectByIdResponse,
  GetReductionProjectsMinimalResponse,
} from "@repo/types";
import type { ReductionProjectDisplayStatus } from "@repo/types";
import { GwpSourceSchema } from "@repo/types";
import { ConsideredGeiSchema } from "@repo/types";

function mapPersistenceFields(
  row: Prisma.ReductionProjectGetPayload<object>
): Omit<GetReductionProjectByIdResponse, "status"> {
  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId.toString(),
    carbonInventoryId: row.carbonInventoryId.toString(),
    implementationDate: row.implementationDate,
    description: row.description,
    subcategoryId: row.subcategoryId.toString(),
    gwpUsed: row.gwpUsed ? GwpSourceSchema.parse(row.gwpUsed) : null,
    consideredGei: row.consideredGei.map((gei) =>
      ConsideredGeiSchema.parse(gei)
    ),
    reportedElsewhere: row.reportedElsewhere,
    reportedElsewhereDescription: row.reportedElsewhereDescription,
    year: row.year,
    baselineScenario: row.baselineScenario.toString(),
    projectScenario: row.projectScenario.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
  };
}

export function mapReductionProjectToGetByIdResponse(
  row: Prisma.ReductionProjectGetPayload<object>,
  displayStatus: ReductionProjectDisplayStatus
): GetReductionProjectByIdResponse {
  return {
    ...mapPersistenceFields(row),
    status: displayStatus,
  };
}

type ReductionProjectListRow = Prisma.ReductionProjectGetPayload<{
  select: {
    id: true;
    name: true;
    year: true;
    createdAt: true;
    baselineScenario: true;
    projectScenario: true;
    status: true;
    submission: {
      select: {
        subject: {
          select: {
            submissions: {
              select: { id: true; status: true; type: true };
            };
          };
        };
      };
    };
  };
}>;

export function mapReductionProjectToListItem(
  row: ReductionProjectListRow,
  displayStatus: ReductionProjectDisplayStatus
): GetAllReductionProjectsResponse[number] {
  const totalReduction =
    Number(row.baselineScenario.toString()) -
    Number(row.projectScenario.toString());

  return {
    id: row.id.toString(),
    name: row.name,
    year: row.year,
    firstReportDate: row.createdAt.toISOString(),
    totalReduction,
    status: displayStatus,
  };
}

export function mapReductionProjectToMinimalItem(
  row: Pick<
    Prisma.ReductionProjectGetPayload<object>,
    "id" | "name" | "organizationId" | "year"
  >,
  displayStatus: ReductionProjectDisplayStatus
): GetReductionProjectsMinimalResponse[number] {
  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId.toString(),
    status: displayStatus,
    year: row.year,
  };
}
