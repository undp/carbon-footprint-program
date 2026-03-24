import type {
  ReductionProject as PrismaReductionProject,
  ReductionProjectFile as PrismaFile,
  ReductionProjectReport as PrismaReport,
} from "@repo/database";
import type {
  ReductionProject,
  ReductionProjectFile,
  ReductionProjectReport,
  ReductionProjectSummary,
} from "@repo/types";

export const mapFileToResponse = (file: PrismaFile): ReductionProjectFile => ({
  id: file.id.toString(),
  reductionProjectId: file.reductionProjectId.toString(),
  fileType: file.fileType,
  fileName: file.fileName,
  fileUrl: file.fileUrl,
  fileSizeBytes: file.fileSizeBytes,
  mimeType: file.mimeType,
});

export const mapReportToResponse = (
  report: PrismaReport
): ReductionProjectReport => ({
  id: report.id.toString(),
  reductionProjectId: report.reductionProjectId.toString(),
  reductionYear: report.reductionYear,
  baselineValue: Number(report.baselineValue),
  projectValue: Number(report.projectValue),
  reductionValue: Number(report.reductionValue),
  createdAt: report.createdAt.toISOString(),
  updatedAt: report.updatedAt?.toISOString() ?? null,
});

type ProjectWithFilesAndReports = PrismaReductionProject & {
  files?: PrismaFile[];
  reports?: PrismaReport[];
};

export const mapReductionProjectToResponse = (
  project: ProjectWithFilesAndReports
): ReductionProject => ({
  id: project.id.toString(),
  organizationId: project.organizationId.toString(),
  organizationBranchId: project.organizationBranchId?.toString() ?? null,
  name: project.name,
  description: project.description ?? null,
  implementationDate: project.implementationDate?.toISOString() ?? null,
  subcategoryId: project.subcategoryId?.toString() ?? null,
  pcg: project.pcg ?? null,
  usePcgNationalInventory: project.usePcgNationalInventory,
  selectedGases: project.selectedGases,
  reportedInOtherInitiative: project.reportedInOtherInitiative,
  otherInitiativeDescription: project.otherInitiativeDescription ?? null,
  status: project.status,
  reports: (project.reports ?? []).map(mapReportToResponse),
  files: (project.files ?? []).map(mapFileToResponse),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt?.toISOString() ?? null,
});

export const mapReductionProjectWithoutFilesOrReports = (
  project: PrismaReductionProject
): Omit<ReductionProject, "files" | "reports"> => {
  const { files: _f, reports: _r, ...rest } = mapReductionProjectToResponse(project);
  return rest;
};

// reports are pre-sorted by createdAt asc by the DB query (orderBy: { createdAt: "asc" })
export const mapReductionProjectSummary = (
  project: PrismaReductionProject & { reports: PrismaReport[] }
): ReductionProjectSummary => ({
  id: project.id.toString(),
  organizationId: project.organizationId.toString(),
  organizationBranchId: project.organizationBranchId?.toString() ?? null,
  name: project.name,
  usePcgNationalInventory: project.usePcgNationalInventory,
  status: project.status,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt?.toISOString() ?? null,
  firstReportDate: project.reports[0]?.createdAt.toISOString() ?? null,
  reportYears: [...new Set(project.reports.map((r) => r.reductionYear))],
  totalReduction: project.reports.reduce(
    (sum, r) => sum + Number(r.reductionValue),
    0
  ),
});
