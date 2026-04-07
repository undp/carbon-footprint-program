import type {
  GetReductionProjectByIdResponse,
  UpdateReductionProjectRequest,
} from "@repo/types";
import type { ReductionProjectFormValues } from "./types";

export const mapProjectToFormValues = (
  project: GetReductionProjectByIdResponse
): ReductionProjectFormValues => ({
  name: project.name ?? "",
  organizationId: project.organizationId ?? "",
  carbonInventoryId: project.carbonInventoryId ?? "",
  implementationDate: project.implementationDate
    ? project.implementationDate.slice(0, 10)
    : "",
  description: project.description ?? "",
  subcategoryId: project.subcategoryId ?? "",
  gwpUsed: project.gwpUsed ?? "",
  useNationalGwp: project.useNationalGwp,
  consideredGei: project.consideredGei,
  reportedElsewhere: project.reportedElsewhere,
  reportedElsewhereDescription: project.reportedElsewhereDescription ?? "",
  year: project.year ?? "",
  baselineScenario: project.baselineScenario ?? "",
  projectScenario: project.projectScenario ?? "",
  files: [],
});

export const mapFormValuesToRequest = (
  values: Omit<ReductionProjectFormValues, "files">
): UpdateReductionProjectRequest => {
  return {
    name: values.name || null,
    organizationId: values.organizationId || null,
    carbonInventoryId: values.carbonInventoryId || null,
    implementationDate: values.implementationDate
      ? new Date(values.implementationDate).toISOString()
      : null,
    description: values.description || null,
    subcategoryId: values.subcategoryId || null,
    gwpUsed: values.gwpUsed || null,
    useNationalGwp: values.useNationalGwp,
    consideredGei: values.consideredGei,
    reportedElsewhere: values.reportedElsewhere,
    reportedElsewhereDescription: values.reportedElsewhereDescription || null,
    year: values.year !== "" ? values.year : null,
    baselineScenario: values.baselineScenario || null,
    projectScenario: values.projectScenario || null,
  };
};
