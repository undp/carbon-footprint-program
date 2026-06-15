import { z } from "zod";
import { ConsideredGeiSchema, GwpSourceSchema } from "@repo/types";
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/constants";

export const createReductionProjectFormSchema = () =>
  z
    .object({
      name: z.string().min(1, "El nombre es requerido"),
      organizationId: z.string().min(1, "La organización es requerida"),
      carbonInventoryId: z.string().min(1, "La huella es requerida"),
      implementationDate: z
        .string()
        .min(1, "La fecha de implementación es requerida"),
      description: z
        .string()
        .min(1, "La descripción es requerida")
        .max(
          REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH,
          `La descripción no puede superar los ${REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH} caracteres`
        ),
      subcategoryId: z.string().min(1, "La subcategoría es requerida"),
      gwpUsed: z.union([GwpSourceSchema, z.literal("")]),
      consideredGei: z
        .array(ConsideredGeiSchema)
        .min(1, "Debe seleccionar al menos un GEI considerado"),
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
      if (data.year === "") {
        ctx.addIssue({
          code: "custom",
          path: ["year"],
          message: "El año es requerido",
        });
      }
      if (data.baselineScenario === null) {
        ctx.addIssue({
          code: "custom",
          path: ["baselineScenario"],
          message: "El escenario de línea base es requerido",
        });
      }
      if (data.projectScenario === null) {
        ctx.addIssue({
          code: "custom",
          path: ["projectScenario"],
          message: "El escenario del proyecto es requerido",
        });
      }
      if (
        data.year !== "" &&
        data.implementationDate &&
        new Date(data.implementationDate).getFullYear() > data.year
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["implementationDate"],
          message: `El año no puede ser posterior al año de la huella (${data.year})`,
        });
      }
      if (
        data.baselineScenario !== null &&
        data.projectScenario !== null &&
        data.baselineScenario < data.projectScenario
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["baselineScenario"],
          message: "El escenario base no puede ser inferior al del proyecto",
        });
      }
    });

export type ReductionProjectFormValues = z.infer<
  ReturnType<typeof createReductionProjectFormSchema>
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
