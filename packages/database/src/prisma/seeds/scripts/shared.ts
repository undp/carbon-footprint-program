import { z } from "zod";
import { type Prisma } from "../../../index.js";

type RoleData = Pick<Prisma.RoleCreateInput, "name" | "description">[];

export const RoleDataSchema: z.ZodType<RoleData> = z.array(
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
);

export const FullMethodologyDataSchema = z.array(
  z.object({
    countryIsoCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    categories: z.array(
      z.object({
        name: z.string().min(1),
        synonyms: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        examples: z.string().nullable().optional(),
        position: z.int(),
        subcategories: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().nullable().optional(),
            examples: z.string().nullable().optional(),
            allowedMeasurementUnitsAbbreviations: z.array(z.string()).optional(),
            emissionFactorDimensions: z
              .array(
                z.object({
                  code: z.string().min(1),
                  name: z.string().min(1),
                  position: z.int(),
                  isRequired: z.boolean(),
                  values: z.array(
                    z.object({
                      name: z.string().min(1),
                      parentValue: z
                        .object({
                          dimensionCode: z.string().min(1),
                          valueName: z.string().min(1),
                        })
                        .nullable(),
                    })
                  ),
                })
              )
              .optional(),
            emissionFactors: z
              .array(
                z.object({
                  dimensionValue1: z
                    .object({
                      dimensionCode: z.string().min(1),
                      valueName: z.string().min(1),
                    })
                    .nullable(),
                  dimensionValue2: z
                    .object({
                      dimensionCode: z.string().min(1),
                      valueName: z.string().min(1),
                    })
                    .nullable(),
                  rateMeasurementUnitAbbreviation: z.string().min(1),
                  source: z.string().min(1),
                  value: z.number(),
                })
              )
              .optional(),
          })
        ),
      })
    ),
  })
);
