import {
  ReductionProjectDisplayStatusEnum,
  type ReductionProjectDisplayStatus,
} from "@repo/types";

export function isReductionProjectEditable(
  status: ReductionProjectDisplayStatus
): boolean {
  return (
    status === ReductionProjectDisplayStatusEnum.DRAFT ||
    status === ReductionProjectDisplayStatusEnum.REVIEWED
  );
}

/**
 * Whether a reduction project can be submitted for verification: the first
 * submit (DRAFT) and the post-review re-submit (REVIEWED) both go through the
 * `request-verification` endpoint. Mirrors CI's `canSubmitToVerification`.
 */
export function canRequestReductionProjectVerification(
  status: ReductionProjectDisplayStatus
): boolean {
  return (
    status === ReductionProjectDisplayStatusEnum.DRAFT ||
    status === ReductionProjectDisplayStatusEnum.REVIEWED
  );
}

const DELETABLE_STATUSES: ReductionProjectDisplayStatus[] = [
  ReductionProjectDisplayStatusEnum.DRAFT,
];

export function isReductionProjectDeletable(
  status: ReductionProjectDisplayStatus
): boolean {
  return DELETABLE_STATUSES.includes(status);
}

/**
 * Required-field identifiers a reduction project must have before it can be
 * submitted for verification. String values feed the web dialog's label map;
 * labels themselves stay in the frontend (contracts/utils are language-agnostic).
 */
export const ReductionProjectMissingField = {
  IMPLEMENTATION_DATE: "implementationDate",
  DESCRIPTION: "description",
  SUBCATEGORY: "subcategory",
  YEAR: "year",
  BASELINE_SCENARIO: "baselineScenario",
  PROJECT_SCENARIO: "projectScenario",
  CONSIDERED_GEI: "consideredGei",
  GWP_USED: "gwpUsed",
  REPORTED_ELSEWHERE_DESCRIPTION: "reportedElsewhereDescription",
} as const;

export type ReductionProjectMissingField =
  (typeof ReductionProjectMissingField)[keyof typeof ReductionProjectMissingField];

// A scenario value as it arrives on either side: a plain number (client, from the
// Zod response) or a Prisma Decimal (server). Only nullability is inspected, so
// this structural type avoids importing Prisma into the framework-agnostic utils.
type ScenarioValue = number | { toNumber(): number };

export interface ReductionProjectCompletenessFields {
  implementationDate: string | null;
  description: string | null;
  subcategoryId: string | bigint | null;
  year: number | null;
  baselineScenario: ScenarioValue | null;
  projectScenario: ScenarioValue | null;
  consideredGei: readonly string[];
  gwpUsed: string | null;
  reportedElsewhere: boolean;
  reportedElsewhereDescription: string | null;
}

/**
 * Returns the list of required fields still missing before a reduction project
 * can be submitted. Pure — called by both the server submit gate (source of
 * truth) and the list actions cell (UX pre-check). Mirrors CI's
 * `getInventoryMissingFields`, but shared instead of duplicated per side.
 */
export function getReductionProjectMissingFields(
  project: ReductionProjectCompletenessFields
): ReductionProjectMissingField[] {
  const missing: ReductionProjectMissingField[] = [];

  if (!project.implementationDate) {
    missing.push(ReductionProjectMissingField.IMPLEMENTATION_DATE);
  }
  // Free-text fields are trimmed so a whitespace-only value counts as missing,
  // matching the form's `.trim()` validation (an API-direct caller can't slip
  // past with "   ").
  if (!project.description?.trim()) {
    missing.push(ReductionProjectMissingField.DESCRIPTION);
  }
  if (project.subcategoryId == null) {
    missing.push(ReductionProjectMissingField.SUBCATEGORY);
  }
  if (project.year == null) {
    missing.push(ReductionProjectMissingField.YEAR);
  }
  if (project.baselineScenario == null) {
    missing.push(ReductionProjectMissingField.BASELINE_SCENARIO);
  }
  if (project.projectScenario == null) {
    missing.push(ReductionProjectMissingField.PROJECT_SCENARIO);
  }
  if (project.consideredGei.length === 0) {
    missing.push(ReductionProjectMissingField.CONSIDERED_GEI);
  }
  if (!project.gwpUsed) {
    missing.push(ReductionProjectMissingField.GWP_USED);
  }
  // Conditionally required: only when the project claims to be reported
  // elsewhere must it carry a (non-whitespace) description of that report.
  if (
    project.reportedElsewhere &&
    !project.reportedElsewhereDescription?.trim()
  ) {
    missing.push(ReductionProjectMissingField.REPORTED_ELSEWHERE_DESCRIPTION);
  }

  return missing;
}

/**
 * Semantic-validity identifiers a reduction project must satisfy — beyond mere
 * field presence — before it can be submitted for verification. These mirror the
 * two cross-field invariants the web form enforces in its `superRefine`. String
 * values (like the missing-field identifiers) feed the frontend's label map;
 * labels themselves stay in the frontend (contracts/utils are language-agnostic).
 */
export const ReductionProjectInvalidField = {
  // The baseline scenario must be at least the project scenario; otherwise the
  // reduction (baseline - project) is negative, i.e. it does not actually reduce.
  SCENARIO_ORDER: "scenarioOrder",
  // The implementation year cannot be later than the project's reporting year.
  IMPLEMENTATION_DATE_YEAR: "implementationDateYear",
} as const;

export type ReductionProjectInvalidField =
  (typeof ReductionProjectInvalidField)[keyof typeof ReductionProjectInvalidField];

function scenarioToNumber(value: ScenarioValue): number {
  return typeof value === "number" ? value : value.toNumber();
}

/**
 * Returns the semantic invariants a reduction project violates. Complements
 * `getReductionProjectMissingFields`: that gate checks field presence, this one
 * checks relationships between already-present fields. Pure — shared by the
 * server submit gate (source of truth) and the web form's validation so the two
 * can't drift. Null/absent fields are skipped here: their absence is a
 * completeness concern owned by `getReductionProjectMissingFields`.
 */
export function getReductionProjectInvalidFields(
  project: ReductionProjectCompletenessFields
): ReductionProjectInvalidField[] {
  const invalid: ReductionProjectInvalidField[] = [];

  if (
    project.baselineScenario != null &&
    project.projectScenario != null &&
    scenarioToNumber(project.baselineScenario) <
      scenarioToNumber(project.projectScenario)
  ) {
    invalid.push(ReductionProjectInvalidField.SCENARIO_ORDER);
  }

  if (project.implementationDate && project.year != null) {
    const implementationYear = new Date(
      project.implementationDate
    ).getFullYear();
    if (implementationYear > project.year) {
      invalid.push(ReductionProjectInvalidField.IMPLEMENTATION_DATE_YEAR);
    }
  }

  return invalid;
}
