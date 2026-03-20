import { z } from "zod";
import type {
  GetSystemParametersQuerySchema,
  GetSystemParametersResponseSchema,
  SystemParameterKeySchema,
  MeasurementRecognitionBehaviorSchema,
  SystemParameterEntrySchema,
} from "./schemas.js";

export type GetSystemParametersQuery = z.infer<
  typeof GetSystemParametersQuerySchema
>;
export type GetSystemParametersResponse = z.infer<
  typeof GetSystemParametersResponseSchema
>;
export type SystemParameterKey = z.infer<typeof SystemParameterKeySchema>;
export type MeasurementRecognitionBehavior = z.infer<
  typeof MeasurementRecognitionBehaviorSchema
>;
export type SystemParameterEntry = z.infer<typeof SystemParameterEntrySchema>;
