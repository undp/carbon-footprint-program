import { z } from "zod";

export const DeleteCarbonInventoryLineResponseSchema = z.object({
  message: z.string(),
});

export type DeleteCarbonInventoryLineResponse = z.infer<
  typeof DeleteCarbonInventoryLineResponseSchema
>;
