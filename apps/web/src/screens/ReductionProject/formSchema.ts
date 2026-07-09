import { z } from "zod";
import { ConsideredGeiSchema, GwpSourceSchema } from "@repo/types";
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/constants";
import {
  getReductionProjectInvalidFields,
  ReductionProjectInvalidField,
  type ReductionProjectCompletenessFields,
} from "@repo/utils";

// A reduction project is saved as a (possibly partial) draft: only name,
// organization and carbon inventory are required. Every other field is
// validated for format when present, but may be left blank. Full completeness
// is enforced server-side at "Postular a reconocimiento" (request-verification),
// mirrored by the client pre-check in the list actions cell — not here.
export const reductionProjectFormSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    organizationId: z.string().min(1, "La organización es requerida"),
    carbonInventoryId: z.string().min(1, "La huella es requerida"),
    implementationDate: z.string(),
    description: z
      .string()
      .max(
        REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH,
        `La descripción no puede superar los ${REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH} caracteres`
      ),
    subcategoryId: z.string(),
    gwpUsed: z.union([GwpSourceSchema, z.literal("")]),
    consideredGei: z.array(ConsideredGeiSchema),
    reportedElsewhere: z.boolean(),
    reportedElsewhereDescription: z
      .string()
      .max(
        REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH,
        `La descripción no puede superar los ${REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH} caracteres`
      ),
    year: z.union([z.number().int(), z.literal("")]),
    baselineScenario: z.number().nullable(),
    projectScenario: z.number().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.reportedElsewhere && !data.reportedElsewhereDescription.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reportedElsewhereDescription"],
        message:
          "La descripción es requerida cuando las emisiones se reportan en otro lugar",
      });
    }

    // The two cross-field invariants (scenario order and implementation-year vs.
    // reporting year) are decided by the shared `getReductionProjectInvalidFields`
    // — the single source of truth also used by the server submit gate — so the
    // web form and API can't drift. The form only owns the Spanish messages and
    // the field paths they attach to. Null fields are skipped by the util,
    // mirroring the previous inline guards.
    const completenessFields: ReductionProjectCompletenessFields = {
      implementationDate: data.implementationDate || null,
      description: data.description || null,
      subcategoryId: data.subcategoryId || null,
      year: data.year === "" ? null : data.year,
      baselineScenario: data.baselineScenario,
      projectScenario: data.projectScenario,
      consideredGei: data.consideredGei,
      gwpUsed: data.gwpUsed || null,
      reportedElsewhere: data.reportedElsewhere,
      reportedElsewhereDescription: data.reportedElsewhereDescription || null,
    };
    const invalidFields = getReductionProjectInvalidFields(completenessFields);

    if (
      invalidFields.includes(
        ReductionProjectInvalidField.IMPLEMENTATION_DATE_YEAR
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["implementationDate"],
        message: `El año no puede ser posterior al año de la huella (${data.year})`,
      });
    }
    if (invalidFields.includes(ReductionProjectInvalidField.SCENARIO_ORDER)) {
      ctx.addIssue({
        code: "custom",
        path: ["baselineScenario"],
        message: "El escenario base no puede ser inferior al del proyecto",
      });
    }
  });

export type ReductionProjectFormValues = z.infer<
  typeof reductionProjectFormSchema
>;

export const defaultFormValues: ReductionProjectFormValues = {
  name: "",
  organizationId: "",
  carbonInventoryId: "",
  implementationDate: "",
  description: "",
  subcategoryId: "",
  gwpUsed: "",
  consideredGei: [],
  reportedElsewhere: false,
  reportedElsewhereDescription: "",
  year: "",
  baselineScenario: null,
  projectScenario: null,
};
