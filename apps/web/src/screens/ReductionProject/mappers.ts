import type {
  CreateReductionProjectRequest,
  GetReductionProjectByIdResponse,
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
  subcategoryId: project.subcategory?.id ?? "",
  gwpUsed: project.gwpUsed ?? "",
  consideredGei: project.consideredGei,
  reportedElsewhere: project.reportedElsewhere,
  reportedElsewhereDescription: project.reportedElsewhereDescription ?? "",
  year: project.year ?? "",
  baselineScenario: project.baselineScenario,
  projectScenario: project.projectScenario,
  files: [],
  sworn: false,
});

// Builds the full write body shared by create (POST) and update (PATCH). Every
// deferred field is always sent, null when the form left it blank, so a single
// save persists a complete or partial draft (validation is deferred to submit).
// Create and update share the same `ReductionProjectWriteBodySchema`, so a
// single request type is assignable to both mutations.
export const mapFormValuesToMutationData = (
  values: Omit<ReductionProjectFormValues, "files" | "sworn">
): CreateReductionProjectRequest => {
  return {
    name: values.name,
    organizationId: values.organizationId,
    carbonInventoryId: values.carbonInventoryId,
    implementationDate: values.implementationDate || null,
    description: values.description || null,
    subcategoryId: values.subcategoryId || null,
    gwpUsed: values.gwpUsed || null,
    consideredGei: values.consideredGei,
    reportedElsewhere: values.reportedElsewhere,
    reportedElsewhereDescription: values.reportedElsewhere
      ? values.reportedElsewhereDescription || null
      : null,
    year: values.year === "" ? null : Number(values.year),
    baselineScenario: values.baselineScenario,
    projectScenario: values.projectScenario,
  };
};
