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
  const request: Record<string, unknown> = {};

  if (values.name) request.name = values.name;
  else request.name = null;

  if (values.organizationId)
    request.organizationId = Number(values.organizationId);
  else request.organizationId = null;

  if (values.carbonInventoryId)
    request.carbonInventoryId = Number(values.carbonInventoryId);
  else request.carbonInventoryId = null;

  if (values.implementationDate)
    request.implementationDate = new Date(
      values.implementationDate
    ).toISOString();
  else request.implementationDate = null;

  if (values.description) request.description = values.description;
  else request.description = null;

  if (values.subcategoryId)
    request.subcategoryId = Number(values.subcategoryId);
  else request.subcategoryId = null;

  if (values.gwpUsed) request.gwpUsed = values.gwpUsed;
  else request.gwpUsed = null;

  request.useNationalGwp = values.useNationalGwp;
  request.consideredGei = values.consideredGei;
  request.reportedElsewhere = values.reportedElsewhere;

  if (values.reportedElsewhereDescription)
    request.reportedElsewhereDescription = values.reportedElsewhereDescription;
  else request.reportedElsewhereDescription = null;

  if (values.year !== "") request.year = Number(values.year);
  else request.year = null;

  if (values.baselineScenario)
    request.baselineScenario = values.baselineScenario;
  else request.baselineScenario = null;

  if (values.projectScenario) request.projectScenario = values.projectScenario;
  else request.projectScenario = null;

  return request as UpdateReductionProjectRequest;
};
