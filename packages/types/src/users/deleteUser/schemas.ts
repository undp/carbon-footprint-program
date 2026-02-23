import { z } from "zod";
import { UserSchema } from "../baseSchemas.js";
import { IdSchema } from "../../zod.js";

export const DeleteUserParamsSchema = UserSchema.pick({
  id: true,
}).strict();

export const DeleteUserResponseSchema = z.object({
  message: z.string().describe("Confirmation message"),
  id: IdSchema.describe("The ID of the deleted user"),
});
