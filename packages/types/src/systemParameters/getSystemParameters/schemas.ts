import { z } from "zod";
import { listQueryParam } from "../../zod.js";

export const SystemParameterKeySchema = z.enum([
  "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
  "SUBCATEGORY_RECOMMENDATION_MODE",
  "USER_INACTIVE_THRESHOLD_DAYS",
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
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE),
    value: SubcategoryRecommendationModeSchema,
  }),
  z.object({
    key: z.literal(SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS),
    value: UserInactiveThresholdDaysSchema,
  }),
]);

export const GetSystemParametersQuerySchema = z.object({
  keys: listQueryParam().optional().describe("Comma-separated parameter keys"),
});

export const GetSystemParametersResponseSchema = z.array(
  SystemParameterEntrySchema
);
