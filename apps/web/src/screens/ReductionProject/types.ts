import { z } from "zod";
import { ConsideredGeiSchema, GwpSourceSchema } from "@repo/types";

export const createReductionProjectFormSchema = (showFileUpload: boolean) =>
  z
    .object({
      name: z.string().min(1, "El nombre es requerido"),
      organizationId: z.string().min(1, "La organización es requerida"),
      carbonInventoryId: z
        .string()
        .min(1, "El inventario de carbono es requerido"),
      implementationDate: z
        .string()
        .min(1, "La fecha de implementación es requerida"),
      description: z.string().min(1, "La descripción es requerida"),
      subcategoryId: z.string().min(1, "La subcategoría es requerida"),
      gwpUsed: z.union([GwpSourceSchema, z.literal("")]),
      consideredGei: z
        .array(ConsideredGeiSchema)
        .min(1, "Debe seleccionar al menos un GEI considerado"),
      reportedElsewhere: z.boolean(),
      reportedElsewhereDescription: z.string(),
      year: z.union([z.number().int(), z.literal("")]),
      baselineScenario: z
        .string()
        .min(1, "El escenario de línea base es requerido")
        .refine((val) => !isNaN(Number(val)), {
          message: "Debe ser un número válido",
        }),
      projectScenario: z
        .string()
        .min(1, "El escenario del proyecto es requerido")
        .refine((val) => !isNaN(Number(val)), {
          message: "Debe ser un número válido",
        }),
      sworn: z.boolean(),
      files: showFileUpload
        ? z
            .array(z.instanceof(File))
            .min(1, "Debe adjuntar al menos un archivo")
        : z.array(z.instanceof(File)),
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
      if (showFileUpload && !data.sworn) {
        ctx.addIssue({
          code: "custom",
          path: ["sworn"],
          message: "Debe aceptar la declaración jurada para continuar",
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
  baselineScenario: "",
  projectScenario: "",
  sworn: false,
  files: [],
};
