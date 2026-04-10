import { Prisma } from "@repo/database";
import type {
  GetAllReductionProjectsResponse,
  GetReductionProjectByIdResponse,
  GetReductionProjectsMinimalResponse,
  UpdateReductionProjectResponse,
} from "@repo/types";
import type { ReductionProjectDisplayStatus } from "@repo/types";
import type { ReductionProjectStatus } from "@repo/types";
import { GwpSourceSchema } from "@repo/types";
import { ConsideredGeiSchema } from "@repo/types";

type ReductionProjectRow = {
  id: bigint;
  name: string | null;
  organizationId: bigint | null;
  carbonInventoryId: bigint | null;
  implementationDate: Date | null;
  description: string | null;
  subcategoryId: bigint | null;
  gwpUsed: string | null;
  useNationalGwp: boolean;
  consideredGei: string[];
  reportedElsewhere: boolean;
  reportedElsewhereDescription: string | null;
  year: number | null;
  baselineScenario: Prisma.Decimal | null;
  projectScenario: Prisma.Decimal | null;
  status: ReductionProjectStatus;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
};

function decimalToString(value: Prisma.Decimal | null): string | null {
  if (value === null) return null;
  return value.toString();
}

function mapPersistenceFields(
  row: ReductionProjectRow
): Omit<GetReductionProjectByIdResponse, "status"> {
  return {
    id: row.id.toString(),
    name: row.name,
    organizationId: row.organizationId?.toString() ?? null,
    carbonInventoryId: row.carbonInventoryId?.toString() ?? null,
    implementationDate: row.implementationDate?.toISOString() ?? null,
    description: row.description,
    subcategoryId: row.subcategoryId?.toString() ?? null,
    gwpUsed: row.gwpUsed ? GwpSourceSchema.parse(row.gwpUsed) : null,
    useNationalGwp: row.useNationalGwp,
    consideredGei: row.consideredGei.map((gei) =>
      ConsideredGeiSchema.parse(gei)
    ),
    reportedElsewhere: row.reportedElsewhere,
    reportedElsewhereDescription: row.reportedElsewhereDescription,
    year: row.year,
    baselineScenario: decimalToString(row.baselineScenario),
    projectScenario: decimalToString(row.projectScenario),
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

export function mapReductionProjectToUpdateResponse(
  row: ReductionProjectRow
): UpdateReductionProjectResponse {
  return mapPersistenceFields(row);
}

export function mapReductionProjectToListItem(
  row: ReductionProjectRow & {
    organization?: { summary?: { name: string | null } | null } | null;
  },
  displayStatus: ReductionProjectDisplayStatus
): GetAllReductionProjectsResponse[number] {
  const baseline = row.baselineScenario;
  const project = row.projectScenario;
  let totalReduction: number | null = null;
  if (baseline !== null && project !== null) {
    totalReduction = Number(baseline.toString()) - Number(project.toString());
  }

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
    organizationId: row.organizationId?.toString() ?? null,
    status: displayStatus,
    year: row.year,
  };
}
