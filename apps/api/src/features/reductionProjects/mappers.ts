import { Prisma } from "@repo/database";
import type {
  GetAllReductionProjectsResponse,
  GetReductionProjectByIdResponse,
  GetReductionProjectsMinimalResponse,
} from "@repo/types";
import type { ReductionProjectDisplayStatus } from "@repo/types";
import { GwpSourceSchema } from "@repo/types";
import { ConsideredGeiSchema } from "@repo/types";

type ReductionProjectWithRelations = Prisma.ReductionProjectGetPayload<{
  include: {
    subcategory: { select: { id: true; name: true } };
    organization: {
      select: { id: true; summary: { select: { name: true } } };
    };
    carbonInventory: { select: { id: true; name: true; year: true } };
  };
}>;

function mapPersistenceFields(
  row: ReductionProjectWithRelations
): Omit<GetReductionProjectByIdResponse, "status"> {
  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId.toString(),
    organization: {
      id: row.organization.id.toString(),
      name: row.organization.summary?.name ?? null,
    },
    carbonInventoryId: row.carbonInventoryId.toString(),
    carbonInventory: {
      id: row.carbonInventory.id.toString(),
      name: row.carbonInventory.name,
      year: row.carbonInventory.year,
    },
    implementationDate: row.implementationDate,
    description: row.description,
    subcategory: row.subcategory
      ? {
          id: row.subcategory.id.toString(),
          name: row.subcategory.name,
        }
      : null,
    gwpUsed: row.gwpUsed ? GwpSourceSchema.parse(row.gwpUsed) : null,
    consideredGei: row.consideredGei.map((gei) =>
      ConsideredGeiSchema.parse(gei)
    ),
    reportedElsewhere: row.reportedElsewhere,
    reportedElsewhereDescription: row.reportedElsewhereDescription,
    year: row.year,
    baselineScenario: row.baselineScenario?.toNumber() ?? null,
    projectScenario: row.projectScenario?.toNumber() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
  };
}

export function mapReductionProjectToGetByIdResponse(
  row: ReductionProjectWithRelations,
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
    organizationId: true;
    implementationDate: true;
    description: true;
    subcategoryId: true;
    consideredGei: true;
    baselineScenario: true;
    projectScenario: true;
    gwpUsed: true;
    reportedElsewhere: true;
    reportedElsewhereDescription: true;
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
    organization: {
      select: {
        summary: {
          select: { name: true; displayStatus: true };
        };
      };
    };
  };
}>;

export function mapReductionProjectToListItem(
  row: ReductionProjectListRow,
  displayStatus: ReductionProjectDisplayStatus
): GetAllReductionProjectsResponse[number] {
  const baselineScenario = row.baselineScenario?.toNumber() ?? null;
  const projectScenario = row.projectScenario?.toNumber() ?? null;
  const totalReduction =
    baselineScenario != null && projectScenario != null
      ? baselineScenario - projectScenario
      : null;

  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId.toString(),
    year: row.year,
    // Raw completeness fields — the list actions cell computes the "why can't
    // submit" state client-side via getReductionProjectMissingFields.
    implementationDate: row.implementationDate,
    description: row.description,
    subcategoryId: row.subcategoryId?.toString() ?? null,
    consideredGei: row.consideredGei.map((gei) =>
      ConsideredGeiSchema.parse(gei)
    ),
    baselineScenario,
    projectScenario,
    gwpUsed: row.gwpUsed ? GwpSourceSchema.parse(row.gwpUsed) : null,
    reportedElsewhere: row.reportedElsewhere,
    reportedElsewhereDescription: row.reportedElsewhereDescription,
    firstReportDate: row.createdAt.toISOString(),
    totalReduction,
    status: displayStatus,
    organizationName: row.organization?.summary?.name ?? null,
    organizationDisplayStatus: row.organization?.summary?.displayStatus ?? null,
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
