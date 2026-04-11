import { Prisma } from "@repo/database";
import type {
  GetAllReductionProjectsResponse,
  GetReductionProjectByIdResponse,
  GetReductionProjectsMinimalResponse,
} from "@repo/types";
import type { ReductionProjectDisplayStatus } from "@repo/types";
import type { ReductionProjectStatus } from "@repo/types";
import { GwpSourceSchema } from "@repo/types";
import { ConsideredGeiSchema } from "@repo/types";

type ReductionProjectRow = {
  id: bigint;
  name: string;
  organizationId: bigint;
  carbonInventoryId: bigint;
  implementationDate: Date;
  description: string;
  subcategoryId: bigint;
  gwpUsed: string | null;
  consideredGei: string[];
  reportedElsewhere: boolean;
  reportedElsewhereDescription: string | null;
  year: number | null;
  baselineScenario: Prisma.Decimal;
  projectScenario: Prisma.Decimal;
  status: ReductionProjectStatus;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
};

function mapPersistenceFields(
  row: ReductionProjectRow
): Omit<GetReductionProjectByIdResponse, "status"> {
  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId.toString(),
    carbonInventoryId: row.carbonInventoryId.toString(),
    implementationDate: row.implementationDate.toISOString(),
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
  row: ReductionProjectRow,
  displayStatus: ReductionProjectDisplayStatus
): GetReductionProjectByIdResponse {
  return {
    ...mapPersistenceFields(row),
    status: displayStatus,
  };
}

export function mapReductionProjectToListItem(
  row: ReductionProjectRow & {
    organization?: { summary?: { name: string | null } | null } | null;
  },
  displayStatus: ReductionProjectDisplayStatus
): GetAllReductionProjectsResponse[number] {
  const totalReduction =
    Number(row.baselineScenario.toString()) -
    Number(row.projectScenario.toString());

  return {
    ...mapPersistenceFields(row),
    organizationName: row.organization?.summary?.name ?? null,
    firstReportDate: row.createdAt.toISOString(),
    totalReduction,
    reportedYears: row.year != null ? 1 : 0,
    status: displayStatus,
  };
}

export function mapReductionProjectToMinimalItem(
  row: Pick<ReductionProjectRow, "id" | "name" | "organizationId" | "year">,
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
