import type {
  GetReductionProjectByIdResponse,
  ReductionProjectMutationData,
} from "@repo/types";
import type { ReductionProjectFormValues } from "./types";

export const mapProjectToFormValues = (
  project: GetReductionProjectByIdResponse
): ReductionProjectFormValues => ({
  name: project.name ?? "",
  organizationId: project.organizationId ?? "",
  carbonInventoryId: project.carbonInventoryId ?? "",
  implementationDate: project.implementationDate
    ? new Date(project.implementationDate).toISOString().split("T")[0]
    : "",
  description: project.description ?? "",
  subcategoryId: project.subcategoryId ?? "",
  gwpUsed: project.gwpUsed ?? "",
  consideredGei: project.consideredGei,
  reportedElsewhere: project.reportedElsewhere,
  reportedElsewhereDescription: project.reportedElsewhereDescription ?? "",
  year: project.year ?? "",
  baselineScenario: project.baselineScenario ?? "",
  projectScenario: project.projectScenario ?? "",
  files: [],
  sworn: false,
});

export const mapFormValuesToMutationData = (
  values: Omit<ReductionProjectFormValues, "files">,
  fileUuids: string[]
): ReductionProjectMutationData => {
  return {
    name: values.name,
    organizationId: values.organizationId,
    carbonInventoryId: values.carbonInventoryId,
    implementationDate: new Date(values.implementationDate).toISOString(),
    description: values.description,
    subcategoryId: values.subcategoryId,
    gwpUsed: values.gwpUsed || null,
    consideredGei: values.consideredGei,
    reportedElsewhere: values.reportedElsewhere,
    reportedElsewhereDescription: values.reportedElsewhereDescription || null,
    year: values.year !== "" ? values.year : null,
    baselineScenario: values.baselineScenario,
    projectScenario: values.projectScenario,
    fileUuids,
  };
};
