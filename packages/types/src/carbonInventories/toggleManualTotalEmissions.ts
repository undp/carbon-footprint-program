import { z } from "zod";

// Request schema
export const ToggleManualTotalEmissionsRequestSchema = z
  .object({
    activated: z
      .boolean()
      .describe("Whether to activate manual total emissions mode"),
  })
  .strict();

export type ToggleManualTotalEmissionsRequest = z.infer<
  typeof ToggleManualTotalEmissionsRequestSchema
>;
