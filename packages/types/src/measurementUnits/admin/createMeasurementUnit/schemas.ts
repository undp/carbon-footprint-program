import { z } from "zod";
import { Magnitude } from "@repo/database/enums";
import {
  MEASUREMENT_UNIT_NAME_MAX_LENGTH,
  MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH,
} from "@repo/constants";
import { MeasurementUnitBaseSchema } from "../../../baseSchemas/measurementUnit.js";

/* eslint-disable no-control-regex */
const ABBREVIATION_REGEX = /^[^\s/\x00-\x1F\x7F]+$/;
/* eslint-enable no-control-regex */

export const CreateMeasurementUnitBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio." })
    .max(MEASUREMENT_UNIT_NAME_MAX_LENGTH, {
      message: `El nombre no puede superar ${MEASUREMENT_UNIT_NAME_MAX_LENGTH} caracteres.`,
    }),
  abbreviation: z
    .string()
    .trim()
    .min(1, { message: "La abreviatura es obligatoria." })
    .max(MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH, {
      message: `La abreviatura no puede superar ${MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH} caracteres.`,
    })
    .regex(ABBREVIATION_REGEX, {
      message:
        "La abreviatura no puede contener espacios, barras (/) ni caracteres de control.",
    }),
  magnitude: z.enum(Magnitude, {
    message: "La magnitud seleccionada no es válida.",
  }),
  baseFactor: z
    .number()
    .finite({ message: "El factor base debe ser un número finito." })
    .positive({ message: "El factor base debe ser mayor que cero." }),
  isBase: z.boolean(),
});

export const CreateMeasurementUnitResponseSchema =
  MeasurementUnitBaseSchema.extend({
    action: z.enum(["created", "restored-full", "restored-labels"]),
  });
