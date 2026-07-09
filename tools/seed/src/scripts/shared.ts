import { z } from "zod";

const HEX_RGB_REGEX = /^#[0-9A-Fa-f]{3}$/;
const HEX_RGBA_REGEX = /^#[0-9A-Fa-f]{4}$/;
const HEX_RRGGBB_REGEX = /^#[0-9A-Fa-f]{6}$/;
const HEX_RRGGBBAA_REGEX = /^#[0-9A-Fa-f]{8}$/;

export const FullMethodologyDataSchema = z.array(
  z.object({
    countryIsoCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    regulation: z.string().min(1),
    version: z.string().min(1),
    categories: z.array(
      z.object({
        name: z.string().min(1),
        synonyms: z.string().min(1),
        description: z.string().min(1),
        icon: z.string().min(1),
        color: z
          .union([
            z.string().regex(HEX_RGB_REGEX),
            z.string().regex(HEX_RGBA_REGEX),
            z.string().regex(HEX_RRGGBB_REGEX),
            z.string().regex(HEX_RRGGBBAA_REGEX),
          ])
          .describe(
            "Hex color code in #RGB, #RGBA, #RRGGBB, or #RRGGBBAA format"
          ),
        position: z.int(),
        subcategories: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().min(1),
            icon: z.string().min(1),
            allowedMeasurementUnitsAbbreviations: z
              .array(z.string())
              .optional(),
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
