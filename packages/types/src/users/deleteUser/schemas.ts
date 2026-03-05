import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { UserBaseSchema } from "../../baseSchemas/index.js";

export const DeleteUserParamsSchema = UserBaseSchema.pick({
  id: true,
}).strict();

export const DeleteUserResponseSchema = z.object({
  message: z.string().describe("Confirmation message"),
  id: IdSchema.describe("The ID of the deleted user"),
});
