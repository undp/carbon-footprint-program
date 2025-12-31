import { z } from "zod";
import { type Prisma } from "../../../index.js";

type RoleData = Pick<Prisma.roleCreateInput, "name" | "description">[];

export const RoleDataSchema: z.ZodType<RoleData> = z.array(
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
);

export const FullMethodologyDataSchema = z.array(
  z.object({
    country_iso_code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    status_code: z.string().min(1),
    categories: z.array(
      z.object({
        name: z.string().min(1),
        position: z.number(),
        synonyms: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        examples: z.string().nullable().optional(),
        subcategories: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().nullable().optional(),
            examples: z.string().nullable().optional(),
            emission_factor_dimensions: z
              .array(
                z.object({
                  code: z.string().min(1),
                  name: z.string().min(1),
                  position: z.int(),
                  is_required: z.boolean(),
                  values: z.array(
                    z.object({
                      name: z.string().min(1),
                      parent_value: z
                        .object({
                          dimension_code: z.string().min(1),
                          value_name: z.string().min(1),
                        })
                        .nullable(),
                    })
                  ),
                })
              )
              .optional(),
            emission_factors: z
              .array(
                z.object({
                  dimension_value_1: z
                    .object({
                      dimension_code: z.string().min(1),
                      value_name: z.string().min(1),
                    })
                    .nullable(),
                  dimension_value_2: z
                    .object({
                      dimension_code: z.string().min(1),
                      value_name: z.string().min(1),
                    })
                    .nullable(),
                  rate_measurement_unit_abbreviation: z.string().min(1),
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
