import { z } from "zod";
import { listQueryParam } from "../../zod.js";

export const SystemParameterKeySchema = z.enum([
  "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
  "SUBCATEGORY_RECOMMENDATION_MODE",
  "USER_INACTIVE_THRESHOLD_DAYS",
  "TERMS_CONDITIONS_FILE_UUID",
  "MEASURING_ORGANIZATIONS_YEAR_RANGE",
]);

export const SystemParameterKeyEnum = SystemParameterKeySchema.enum;

export const MeasurementRecognitionBehaviorSchema = z.enum([
  "HIDDEN",
  "MANUAL",
  "AUTOMATIC",
]);

export const MeasurementRecognitionBehaviorEnum =
  MeasurementRecognitionBehaviorSchema.enum;

export const SubcategoryRecommendationModeSchema = z.enum([
  "UNION",
  "SPECIFIC",
]);

export const SubcategoryRecommendationModeEnum =
  SubcategoryRecommendationModeSchema.enum;

export const UserInactiveThresholdDaysSchema = z.string().regex(/^\d+$/);

export const TermsConditionsFileUuidSchema = z.union([z.uuid(), z.literal("")]);

export const MeasuringOrganizationsYearRangeSchema = z.string().regex(/^\d+$/);

// Numeric bounds stored on the system_parameter row. Nullable when the
// parameter has no numeric semantics (selectors, file-type pointers).
const SystemParameterBoundsShape = {
  minValue: z.number().int().nullable(),
  maxValue: z.number().int().nullable(),
};

/**
 * IMPORTANT: Every system parameter key MUST have an entry in this discriminated union.
 * This is intentional — if the API returns a parameter whose key is not registered here,
 * Zod parsing will fail. This ensures that the schema, the seed data, and the codebase
 * stay consistent: when adding a new system parameter, you must:
 * 1. Add the key to SystemParameterKeySchema
 * 2. Create a value schema for its allowed values
 * 3. Add a new entry in this discriminated union mapping the key to its value schema
 * 4. Add the parameter to the seed data (systemParameters.json)
 */
export const SystemParameterEntrySchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal(
      SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
    ),
    value: MeasurementRecognitionBehaviorSchema,
    ...SystemParameterBoundsShape,
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE),
    value: SubcategoryRecommendationModeSchema,
    ...SystemParameterBoundsShape,
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS),
    value: UserInactiveThresholdDaysSchema,
    ...SystemParameterBoundsShape,
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID),
    value: TermsConditionsFileUuidSchema,
    ...SystemParameterBoundsShape,
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.MEASURING_ORGANIZATIONS_YEAR_RANGE),
    value: MeasuringOrganizationsYearRangeSchema,
    ...SystemParameterBoundsShape,
  }),
]);

export const GetSystemParametersQuerySchema = z.object({
  keys: listQueryParam().optional().describe("Comma-separated parameter keys"),
});

export const GetSystemParametersResponseSchema = z.array(
  SystemParameterEntrySchema
);
