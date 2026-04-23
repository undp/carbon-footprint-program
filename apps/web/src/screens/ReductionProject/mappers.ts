import type {
  GetReductionProjectByIdResponse,
  ReductionProjectMutationData,
} from "@repo/types";
import type { ReductionProjectFormValues } from "./formSchema";

export const mapProjectToFormValues = (
  project: GetReductionProjectByIdResponse
): ReductionProjectFormValues => ({
  name: project.name ?? "",
  organizationId: project.organizationId ?? "",
  carbonInventoryId: project.carbonInventoryId ?? "",
  implementationDate: project.implementationDate ?? "",
  description: project.description ?? "",
  subcategoryId: project.subcategory.id,
  gwpUsed: project.gwpUsed ?? "",
  consideredGei: project.consideredGei,
  reportedElsewhere: project.reportedElsewhere,
  reportedElsewhereDescription: project.reportedElsewhereDescription ?? "",
  year: project.year,
  baselineScenario: project.baselineScenario.toString(),
  projectScenario: project.projectScenario.toString(),
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
    implementationDate: values.implementationDate,
    description: values.description,
    subcategoryId: values.subcategoryId,
    gwpUsed: values.gwpUsed || null,
    consideredGei: values.consideredGei,
    reportedElsewhere: values.reportedElsewhere,
    reportedElsewhereDescription: values.reportedElsewhere
      ? values.reportedElsewhereDescription
      : null,
    year: Number(values.year),
    baselineScenario: Number(values.baselineScenario),
    projectScenario: Number(values.projectScenario),
    fileUuids,
  };
};
